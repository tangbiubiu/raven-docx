#[tauri::command]
#[specta::specta]
pub fn greet(name: &str) -> Result<String, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    if name.len() > 100 {
        return Err("Name is too long (max 100 characters)".to_string());
    }

    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_success() {
        let result = greet("World");
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap(),
            "Hello, World! You've been greeted from Rust!"
        );
    }

    #[test]
    fn test_greet_empty_name() {
        let result = greet("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Name cannot be empty");
    }

    #[test]
    fn test_greet_whitespace_only() {
        let result = greet("   ");
        assert!(result.is_err());
    }

    #[test]
    fn test_greet_too_long() {
        let long_name = "a".repeat(101);
        let result = greet(&long_name);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("too long"));
    }

    #[test]
    fn test_greet_trims_whitespace() {
        let result = greet("  Bob  ");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Hello, Bob! You've been greeted from Rust!");
    }
}
