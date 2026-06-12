// commands/system.rs — 系统信息
// 获取操作系统、架构、语言等系统级信息

use serde::Serialize;

/// 系统信息
#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub locale: String,
}

/// 获取系统信息（语言、平台等）
#[tauri::command]
#[specta::specta]
pub fn get_system_info() -> Result<SystemInfo, String> {
    let locale = sys_locale::get_locale().unwrap_or_else(|| "en".to_string());

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        locale,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_system_info() {
        let result = get_system_info();
        assert!(result.is_ok());
        let info = result.unwrap();
        // OS 和 arch 应非空
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
        // locale 应合法（至少非空）
        assert!(!info.locale.is_empty());
        // locale 应包含 '-' 或 '_' 或为纯小写字母
        assert!(info.locale.contains('-') || info.locale.contains('_') || info.locale.chars().all(|c| c.is_ascii_lowercase()));
    }
}
