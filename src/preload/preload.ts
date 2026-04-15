import { contextBridge, ipcRenderer } from "electron";

const OPEN_MARKDOWN_FILE_CHANNEL = "yulora:open-markdown-file";

const api = {
  platform: process.platform,
  openMarkdownFile: () => ipcRenderer.invoke(OPEN_MARKDOWN_FILE_CHANNEL)
};

contextBridge.exposeInMainWorld("yulora", api);
