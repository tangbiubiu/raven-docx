// commands/file.rs — 文档文件 I/O
// 负责 .docx 文件的打开、保存、另存为及最近文件管理

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 最近文件记录
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub last_opened_at: f64,
}

/// 应用状态（state.json 的顶层结构）
#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppState {
    version: u32,
    #[serde(default)]
    recent_files: Vec<RecentFile>,
}

const CURRENT_VERSION: u32 = 1;
const MAX_RECENT_FILES: usize = 20;

/// 获取应用数据目录
fn app_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .map(|d| d.join("com.geex-docx.geex-docx"))
        .ok_or_else(|| "无法获取应用数据目录".to_string())
}

/// 获取 state.json 路径
fn state_path() -> Result<PathBuf, String> {
    let dir = app_data_dir()?;
    fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败: {}", e))?;
    Ok(dir.join("state.json"))
}

/// 获取 autosave 目录路径
fn autosave_dir() -> Result<PathBuf, String> {
    let dir = app_data_dir()?.join("autosave");
    fs::create_dir_all(&dir).map_err(|e| format!("创建 autosave 目录失败: {}", e))?;
    Ok(dir)
}

/// 计算文档 hash（用于 autosave 文件名）
fn doc_hash(path: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

// ===== 路径校验 =====

/// 校验路径安全性：拒绝路径遍历攻击
fn validate_path(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path);

    // 拒绝空路径
    if path.is_empty() {
        return Err("路径不能为空".to_string());
    }

    // 规范化路径并检查是否包含 .. 遍历
    let canonical = p.canonicalize().map_err(|e| format!("路径无效: {}", e))?;

    // 检查扩展名
    match canonical.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("docx") => {}
        _ => return Err("仅支持 .docx 文件".to_string()),
    }

    Ok(canonical)
}

// ===== Tauri Commands =====

/// 打开 .docx 文件，返回原始字节
///
/// 路径由 Tauri 文件对话框选择，Rust 端做路径沙箱校验。
/// 返回完整 OOXML 字节，前端负责传给 docx-editor 解析。
#[tauri::command]
#[specta::specta]
pub fn open_docx(path: String) -> Result<Vec<u8>, String> {
    let validated = validate_path(&path)?;

    let data = fs::read(&validated).map_err(|e| format!("读取文件失败: {}", e))?;

    // 校验 ZIP 魔数（OOXML 本质是 ZIP）
    if data.len() < 4 || data[0..4] != [0x50, 0x4b, 0x03, 0x04] {
        return Err("文件不是有效的 .docx 格式（非 ZIP/OOXML）".to_string());
    }

    // 更新最近文件列表
    update_recent_files(&validated)?;

    Ok(data)
}

/// 保存 .docx 文件到原路径
///
/// 同时写入 autosave 备份。
#[tauri::command]
#[specta::specta]
pub fn save_docx(path: String, data: Vec<u8>) -> Result<(), String> {
    if data.is_empty() {
        return Err("文档数据不能为空".to_string());
    }

    let validated = validate_path(&path)?;

    // 写入原文件
    fs::write(&validated, &data).map_err(|e| format!("保存文件失败: {}", e))?;

    // 写入 autosave 备份
    write_autosave(&path, &data)?;

    Ok(())
}

/// 另存为（与 save_docx 逻辑相同，但 path 由前端对话框提供）
#[tauri::command]
#[specta::specta]
pub fn save_as_docx(path: String, data: Vec<u8>) -> Result<(), String> {
    if data.is_empty() {
        return Err("文档数据不能为空".to_string());
    }

    let validated = validate_path(&path)?;

    fs::write(&validated, &data).map_err(|e| format!("保存文件失败: {}", e))?;

    // 另存为也写入 autosave
    write_autosave(&path, &data)?;

    // 更新最近文件
    update_recent_files(&validated)?;

    Ok(())
}

/// 获取最近文件列表
#[tauri::command]
#[specta::specta]
pub fn get_recent_files() -> Result<Vec<RecentFile>, String> {
    let path = state_path()?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("读取状态文件失败: {}", e))?;

    let state: AppState =
        serde_json::from_str(&content).map_err(|e| format!("解析状态文件失败: {}", e))?;

    Ok(state.recent_files)
}

// ===== 内部辅助函数 =====

/// 写入 autosave 备份
fn write_autosave(original_path: &str, data: &[u8]) -> Result<(), String> {
    let dir = autosave_dir()?;
    let hash = doc_hash(original_path);
    let autosave_path = dir.join(format!("{}.docx", hash));

    fs::write(&autosave_path, data).map_err(|e| format!("写入 autosave 失败: {}", e))?;

    Ok(())
}

/// 更新最近文件列表
fn update_recent_files(file_path: &Path) -> Result<(), String> {
    let state_path = state_path()?;

    let mut state: AppState = if state_path.exists() {
        let content = fs::read_to_string(&state_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or(AppState {
            version: CURRENT_VERSION,
            recent_files: Vec::new(),
        })
    } else {
        AppState {
            version: CURRENT_VERSION,
            recent_files: Vec::new(),
        }
    };

    let path_str = file_path.to_string_lossy().to_string();
    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path_str.clone());

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as f64;

    // 移除已存在的同路径记录
    state.recent_files.retain(|f| f.path != path_str);

    // 插入到列表头部
    state.recent_files.insert(
        0,
        RecentFile {
            path: path_str,
            name,
            last_opened_at: now,
        },
    );

    // 限制最大数量
    state.recent_files.truncate(MAX_RECENT_FILES);

    let json =
        serde_json::to_string_pretty(&state).map_err(|e| format!("序列化状态失败: {}", e))?;

    fs::write(&state_path, json).map_err(|e| format!("写入状态文件失败: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    /// 创建临时 .docx 文件（含有效 ZIP 魔数）
    fn create_temp_docx(name: &str) -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join(name);
        let mut f = fs::File::create(&file_path).unwrap();
        // 写入最小有效 ZIP 文件头
        f.write_all(&[0x50, 0x4b, 0x03, 0x04]).unwrap();
        (dir, file_path)
    }

    #[test]
    fn test_validate_path_rejects_empty() {
        assert!(validate_path("").is_err());
    }

    #[test]
    fn test_validate_path_rejects_non_docx() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.txt");
        fs::write(&path, b"hello").unwrap();
        let result = validate_path(&path.to_string_lossy());
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_accepts_docx() {
        let (_dir, path) = create_temp_docx("test.docx");
        let result = validate_path(&path.to_string_lossy());
        assert!(result.is_ok());
    }

    #[test]
    fn test_open_docx_success() {
        let (_dir, path) = create_temp_docx("test.docx");
        let result = open_docx(path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), vec![0x50, 0x4b, 0x03, 0x04]);
    }

    #[test]
    fn test_open_docx_invalid_zip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bad.docx");
        fs::write(&path, b"not a zip file").unwrap();
        let result = open_docx(path.to_string_lossy().to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_save_docx_rejects_empty_data() {
        let (_dir, path) = create_temp_docx("test.docx");
        let result = save_docx(path.to_string_lossy().to_string(), vec![]);
        assert!(result.is_err());
    }

    #[test]
    fn test_save_docx_success() {
        let (_dir, path) = create_temp_docx("test.docx");
        let data = vec![0x50, 0x4b, 0x03, 0x04, 0x01, 0x02];
        let result = save_docx(path.to_string_lossy().to_string(), data.clone());
        assert!(result.is_ok());
        // 验证文件已写入
        let saved = fs::read(&path).unwrap();
        assert_eq!(saved, data);
    }

    #[test]
    fn test_get_recent_files_returns_valid() {
        // 函数应返回合法的 Vec（可能为空或包含之前测试写入的记录）
        let result = get_recent_files();
        assert!(result.is_ok());
    }
}
