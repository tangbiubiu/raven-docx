// commands/keychain.rs — API Key 安全存储
// 通过系统 Keychain (macOS) / Credential Manager (Windows) / Secret Service (Linux)
// 加密存储 API Key，前端仅接收 masked key

const SERVICE_NAME: &str = "com.example.raven.api-key";
const OLD_SERVICE_NAME: &str = "com.geex-docx.geex-docx.api-key";

/// 允许的 provider 白名单
const ALLOWED_PROVIDERS: &[&str] = &["anthropic", "openai", "openai-compatible"];

/// 校验 provider 合法性
fn validate_provider(provider: &str) -> Result<(), String> {
    if ALLOWED_PROVIDERS.contains(&provider) {
        Ok(())
    } else {
        Err(format!(
            "无效的 provider: {}。允许的值: {:?}",
            provider, ALLOWED_PROVIDERS
        ))
    }
}

/// 读取 API Key 并返回 masked 版本（前 4 位 + "..." + 后 4 位）
///
/// 前端不可获取完整 Key，仅看到 masked 版本用于识别已配置的 Key。
/// 未配置时返回空字符串。
#[tauri::command]
#[specta::specta]
pub async fn get_api_key_masked(provider: String) -> Result<String, String> {
    validate_provider(&provider)?;

    // 尝试从新 service name 读取
    let entry = keyring::Entry::new(SERVICE_NAME, &provider)
        .map_err(|e| format!("Keychain 访问失败: {}", e))?;

    match entry.get_password() {
        Ok(key) => {
            if key.len() <= 8 {
                Ok("*".repeat(key.len()))
            } else {
                let prefix = &key[..4];
                let suffix = &key[key.len() - 4..];
                Ok(format!("{}...{}", prefix, suffix))
            }
        }
        Err(keyring::Error::NoEntry) => {
            // 新 service 中不存在，尝试从旧 service 迁移
            migrate_keychain_entry(&provider)?;
            // 迁移后重新读取
            match entry.get_password() {
                Ok(key) => {
                    if key.len() <= 8 {
                        Ok("*".repeat(key.len()))
                    } else {
                        let prefix = &key[..4];
                        let suffix = &key[key.len() - 4..];
                        Ok(format!("{}...{}", prefix, suffix))
                    }
                }
                Err(keyring::Error::NoEntry) => Ok(String::new()),
                Err(e) => Err(format!("读取 Keychain 失败: {}", e)),
            }
        }
        Err(e) => Err(format!("读取 Keychain 失败: {}", e)),
    }
}

/// 写入 API Key 到系统 Keychain
///
/// 前端传入完整 Key，Rust 端加密存储到系统 Keychain。
/// 不落盘明文。
#[tauri::command]
#[specta::specta]
pub async fn set_api_key(provider: String, key: String) -> Result<(), String> {
    validate_provider(&provider)?;

    if key.is_empty() {
        return Err("API Key 不能为空".to_string());
    }

    let entry = keyring::Entry::new(SERVICE_NAME, &provider)
        .map_err(|e| format!("Keychain 访问失败: {}", e))?;

    entry
        .set_password(&key)
        .map_err(|e| format!("Keychain 写入失败: {}", e))?;

    Ok(())
}

/// 删除 Keychain 中的 API Key
#[tauri::command]
#[specta::specta]
pub async fn delete_api_key(provider: String) -> Result<(), String> {
    validate_provider(&provider)?;

    let entry = keyring::Entry::new(SERVICE_NAME, &provider)
        .map_err(|e| format!("Keychain 访问失败: {}", e))?;

    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // 不存在也算成功
        Err(e) => Err(format!("Keychain 删除失败: {}", e)),
    }
}

/// 迁移旧版 Keychain 条目到新 service name
fn migrate_keychain_entry(provider: &str) -> Result<(), String> {
    let old_entry = keyring::Entry::new(OLD_SERVICE_NAME, provider)
        .map_err(|e| format!("Keychain 访问失败: {}", e))?;

    match old_entry.get_password() {
        Ok(key) => {
            // 旧 service 中有 key，写入新 service
            let new_entry = keyring::Entry::new(SERVICE_NAME, provider)
                .map_err(|e| format!("Keychain 访问失败: {}", e))?;
            new_entry
                .set_password(&key)
                .map_err(|e| format!("Keychain 迁移写入失败: {}", e))?;
            log::info!("[migrate] Keychain 迁移成功: provider={}", provider);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => Ok(()), // 旧 service 中也没有，无需迁移
        Err(e) => {
            log::warn!("[migrate] Keychain 迁移读取失败: {}", e);
            Ok(()) // 迁移失败不阻塞，用户可重新配置
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_provider_accepts_valid() {
        assert!(validate_provider("anthropic").is_ok());
        assert!(validate_provider("openai").is_ok());
        assert!(validate_provider("openai-compatible").is_ok());
    }

    #[test]
    fn test_validate_provider_rejects_invalid() {
        assert!(validate_provider("").is_err());
        assert!(validate_provider("google").is_err());
        assert!(validate_provider("../etc/passwd").is_err());
    }
}
