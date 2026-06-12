import { useEffect } from "react";
import WorkspacePage from "@/pages/WorkspacePage";
import { useSettingsStore } from "@/stores/useSettingsStore";
import "./index.css";

function App() {
  // 应用启动时加载持久化设置
  // 应用启动时从 localStorage + Keychain 加载持久化设置
  useEffect(() => {
    useSettingsStore.getState().loadFromStorage();
  }, []);

  return <WorkspacePage />;
}

export default App;
