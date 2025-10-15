chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "summarizeSelection",
      title: "Summarize with DeepSeek",
      contexts: ["selection"]
    })
  })
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "summarizeSelection" && info.selectionText) {
      // Save selection AND a flag indicating "summarize right-click"
      chrome.storage.local.set({
        selectedText: info.selectionText,
        autoSummarize: true
      }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL("popup/popup.html"),
          type: "popup",
          width: 400,
          height: 500
        })
      })
    }
  })
  
  
  