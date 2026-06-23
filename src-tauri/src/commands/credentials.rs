// commands/credentials.rs — pi 凭证同步
// 把 Raven 设置的凭证（存于 Keychain）同步到 pi 隔离配置目录
// Reference: .dev/plan/pi-bundled-design.md §模块2

use std::path::Path;

use serde_json::{json, Value};

use crate::pi::AgentManager;

/// Raven ApiProvider → Keychain provider 名映射
///
/// Raven 前端的 ApiProvider 把 provider 和 api 混在一起。
/// Keychain 里只存三个 key：anthropic / openai / openai-compatible。
fn keychain_provider(raven_provider: &str) -> &'static str {
    match raven_provider {
        "anthropic" => "anthropic",
        "openai-completions" | "openai-responses" => "openai",
        "custom" => "openai-compatible",
        // 兼容直接传 Keychain provider 名的情况
        "openai" => "openai",
        "openai-compatible" => "openai-compatible",
        _ => "openai-compatible",
    }
}

/// 判断是否为内置 provider（不需要写 models.json）
fn is_builtin_provider(raven_provider: &str) -> bool {
    matches!(
        raven_provider,
        "anthropic" | "openai-completions" | "openai-responses" | "openai"
    )
}

/// 生成 auth.json 内容
///
/// 内置 provider 写 api_key 条目；custom provider 返回 None（凭证在 models.json）
fn build_auth_json(raven_provider: &str, api_key: &str) -> Option<Value> {
    let pi_provider = keychain_provider(raven_provider);
    if is_builtin_provider(raven_provider) {
        Some(json!({
            pi_provider: {
                "type": "api_key",
                "key": api_key
            }
        }))
    } else {
        None
    }
}

/// 生成 models.json 内容
///
/// 仅 custom provider 需要写 models.json，含 baseUrl/apiKey/models
fn build_models_json(raven_provider: &str, base_url: &str, api_key: &str, model: &str) -> Option<Value> {
    if is_builtin_provider(raven_provider) {
        return None;
    }

    let api = if raven_provider == "custom" {
        "openai-completions"
    } else {
        "openai-completions"
    };

    Some(json!({
        "providers": {
            "custom": {
                "baseUrl": base_url,
                "api": api,
                "apiKey": api_key,
                "models": [{
                    "id": model,
                    "name": model,
                    "contextWindow": 128000,
                    "maxTokens": 16384
                }]
            }
        }
    }))
}

/// 生成 settings.json 内容
fn build_settings_json(raven_provider: &str, model: &str) -> Value {
    let default_provider = if is_builtin_provider(raven_provider) {
        keychain_provider(raven_provider).to_string()
    } else {
        "custom".to_string()
    };

    json!({
        "defaultProvider": default_provider,
        "defaultModel": model,
        "hideThinkingBlock": true
    })
}

/// 从 Keychain 读取 API key 明文
fn read_api_key_from_keychain(raven_provider: &str) -> Result<String, String> {
    let kc_provider = keychain_provider(raven_provider);
    let entry = keyring::Entry::new(
        "com.example.raven.api-key",
        kc_provider,
    )
    .map_err(|e| format!("Keychain 访问失败: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("从 Keychain 读取 API key 失败: {}", e))
}

/// 写入 JSON 配置文件
fn write_config_file(dir: &Path, filename: &str, content: &Value) -> Result<(), String> {
    let path = dir.join(filename);
    let json_str = serde_json::to_string_pretty(content)
        .map_err(|e| format!("序列化 {} 失败: {}", filename, e))?;
    std::fs::write(&path, json_str)
        .map_err(|e| format!("写入 {} 失败: {}", filename, e))?;

    // auth.json 设置 0600 权限（仅当前用户可读写）
    if filename == "auth.json" {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o600);
            std::fs::set_permissions(&path, perms)
                .map_err(|e| format!("设置 {} 权限失败: {}", filename, e))?;
        }
    }

    log::info!("[credentials] 已写入 {}", filename);
    Ok(())
}

/// 删除配置文件（若存在）
fn remove_config_file(dir: &Path, filename: &str) -> Result<(), String> {
    let path = dir.join(filename);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("删除 {} 失败: {}", filename, e))?;
        log::info!("[credentials] 已删除 {}", filename);
    }
    Ok(())
}

/// 把 Raven 设置的凭证同步到 pi 隔离配置目录
///
/// 在用户保存 API 配置时由前端调用。
/// Rust 内部从 Keychain 读取明文 key，不经过 IPC 传递。
#[tauri::command]
#[specta::specta]
pub async fn sync_credentials_to_pi(
    provider: String,
    base_url: String,
    model: String,
) -> Result<(), String> {
    log::info!(
        "[credentials] 同步凭证到 pi: provider={}, model={}",
        provider, model
    );

    let agent_dir = AgentManager::pi_agent_dir()?;

    // 从 Keychain 读取 API key 明文（可能不存在，如用户仅切换 provider 未输入 key）
    let api_key = match read_api_key_from_keychain(&provider) {
        Ok(key) if !key.is_empty() => Some(key),
        Ok(_) => {
            log::warn!("[credentials] Keychain 中 API key 为空，仅更新 settings.json");
            None
        }
        Err(e) => {
            log::warn!("[credentials] 从 Keychain 读取 key 失败: {}，仅更新 settings.json", e);
            None
        }
    };

    // 有 key 时写凭证文件；无 key 时跳过（保留现有凭证文件不动）
    if let Some(key) = api_key {
        if is_builtin_provider(&provider) {
            // 内置 provider：写 auth.json + settings.json，删 models.json
            if let Some(auth) = build_auth_json(&provider, &key) {
                write_config_file(&agent_dir, "auth.json", &auth)?;
            }
            remove_config_file(&agent_dir, "models.json")?;
        } else {
            // custom provider：写 models.json + settings.json，删 auth.json
            if let Some(models) = build_models_json(&provider, &base_url, &key, &model) {
                write_config_file(&agent_dir, "models.json", &models)?;
            }
            remove_config_file(&agent_dir, "auth.json")?;
        }
    }

    // settings.json 始终更新（记录当前 provider/model 选择）
    let settings = build_settings_json(&provider, &model);
    write_config_file(&agent_dir, "settings.json", &settings)?;

    log::info!("[credentials] 凭证同步完成");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== keychain_provider 映射测试 =====

    #[test]
    fn test_keychain_provider_anthropic() {
        assert_eq!(keychain_provider("anthropic"), "anthropic");
    }

    #[test]
    fn test_keychain_provider_openai_completions() {
        assert_eq!(keychain_provider("openai-completions"), "openai");
    }

    #[test]
    fn test_keychain_provider_openai_responses() {
        assert_eq!(keychain_provider("openai-responses"), "openai");
    }

    #[test]
    fn test_keychain_provider_custom() {
        assert_eq!(keychain_provider("custom"), "openai-compatible");
    }

    // ===== is_builtin_provider 测试 =====

    #[test]
    fn test_is_builtin_anthropic() {
        assert!(is_builtin_provider("anthropic"));
    }

    #[test]
    fn test_is_builtin_openai_completions() {
        assert!(is_builtin_provider("openai-completions"));
    }

    #[test]
    fn test_is_builtin_openai_responses() {
        assert!(is_builtin_provider("openai-responses"));
    }

    #[test]
    fn test_is_builtin_custom_is_false() {
        assert!(!is_builtin_provider("custom"));
    }

    // ===== build_auth_json 测试 =====

    #[test]
    fn test_build_auth_json_anthropic() {
        let result = build_auth_json("anthropic", "sk-ant-test123").unwrap();
        assert_eq!(result["anthropic"]["type"], "api_key");
        assert_eq!(result["anthropic"]["key"], "sk-ant-test123");
    }

    #[test]
    fn test_build_auth_json_openai_completions() {
        let result = build_auth_json("openai-completions", "sk-test123").unwrap();
        assert_eq!(result["openai"]["type"], "api_key");
        assert_eq!(result["openai"]["key"], "sk-test123");
    }

    #[test]
    fn test_build_auth_json_openai_responses() {
        let result = build_auth_json("openai-responses", "sk-test123").unwrap();
        assert_eq!(result["openai"]["type"], "api_key");
        assert_eq!(result["openai"]["key"], "sk-test123");
    }

    #[test]
    fn test_build_auth_json_custom_returns_none() {
        assert!(build_auth_json("custom", "sk-test").is_none());
    }

    // ===== build_models_json 测试 =====

    #[test]
    fn test_build_models_json_custom() {
        let result = build_models_json(
            "custom",
            "https://api.example.com/v1",
            "sk-test",
            "my-model",
        )
        .unwrap();

        let provider = &result["providers"]["custom"];
        assert_eq!(provider["baseUrl"], "https://api.example.com/v1");
        assert_eq!(provider["api"], "openai-completions");
        assert_eq!(provider["apiKey"], "sk-test");
        assert_eq!(provider["models"][0]["id"], "my-model");
        assert_eq!(provider["models"][0]["name"], "my-model");
    }

    #[test]
    fn test_build_models_json_anthropic_returns_none() {
        assert!(build_models_json("anthropic", "", "sk-test", "claude").is_none());
    }

    #[test]
    fn test_build_models_json_openai_returns_none() {
        assert!(build_models_json("openai-completions", "", "sk-test", "gpt-4").is_none());
    }

    // ===== build_settings_json 测试 =====

    #[test]
    fn test_build_settings_json_anthropic() {
        let result = build_settings_json("anthropic", "claude-sonnet-4");
        assert_eq!(result["defaultProvider"], "anthropic");
        assert_eq!(result["defaultModel"], "claude-sonnet-4");
        assert_eq!(result["hideThinkingBlock"], true);
    }

    #[test]
    fn test_build_settings_json_openai_completions() {
        let result = build_settings_json("openai-completions", "gpt-5");
        assert_eq!(result["defaultProvider"], "openai");
        assert_eq!(result["defaultModel"], "gpt-5");
    }

    #[test]
    fn test_build_settings_json_custom() {
        let result = build_settings_json("custom", "my-model");
        assert_eq!(result["defaultProvider"], "custom");
        assert_eq!(result["defaultModel"], "my-model");
    }

    // ===== write/remove config file 测试 =====

    #[test]
    fn test_write_and_read_config_file() {
        let tmp = tempfile::tempdir().unwrap();
        let content = json!({"test": "value"});
        write_config_file(tmp.path(), "test.json", &content).unwrap();

        let written = std::fs::read_to_string(tmp.path().join("test.json")).unwrap();
        assert!(written.contains("\"test\": \"value\""));
    }

    #[test]
    fn test_remove_config_file_existing() {
        let tmp = tempfile::tempdir().unwrap();
        let content = json!({"test": "value"});
        write_config_file(tmp.path(), "test.json", &content).unwrap();
        assert!(tmp.path().join("test.json").exists());

        remove_config_file(tmp.path(), "test.json").unwrap();
        assert!(!tmp.path().join("test.json").exists());
    }

    #[test]
    fn test_remove_config_file_nonexistent_is_ok() {
        let tmp = tempfile::tempdir().unwrap();
        // 删除不存在的文件不应报错
        assert!(remove_config_file(tmp.path(), "nonexistent.json").is_ok());
    }

    #[test]
    fn test_auth_json_gets_0600_permissions_on_unix() {
        let tmp = tempfile::tempdir().unwrap();
        let content = json!({"openai": {"key": "sk-test"}});
        write_config_file(tmp.path(), "auth.json", &content).unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = std::fs::metadata(tmp.path().join("auth.json")).unwrap();
            let mode = metadata.permissions().mode();
            assert_eq!(
                mode & 0o777,
                0o600,
                "auth.json 应有 0600 权限，实际: {:o}",
                mode
            );
        }
    }
}
