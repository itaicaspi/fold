chrome.runtime.onInstalled.addListener(function() {
  // chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  //   chrome.declarativeContent.onPageChanged.addRules([{
  //     conditions: [new chrome.declarativeContent.PageStateMatcher({
  //       pageUrl: {hostContains: 'www.amazon.com'},
  //     })
  //     ],
  //     actions: [new chrome.declarativeContent.ShowPageAction()]
  //   }]);
  // });
  // chrome.storage.local.remove('tabs');
  // chrome.storage.local.remove('savedTabs');
  // chrome.storage.local.set({'tabs': {}, 'savedTabs': [], 'lastInteractionTime': new Date().getTime(), 'totalInteractionTime': 0});

  // window.localStorage.setItem('tabs', JSON.stringify({}));
  // window.localStorage.setItem('savedTabs', JSON.stringify([]));
  // window.localStorage.setItem('lastInteractionTime', JSON.stringify(new Date().getTime()));
  // window.localStorage.setItem('totalInteractionTime', JSON.stringify(0));

});

const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;
const week = 7 * day;
const month = 31 * day;
const year = 365 * day;

const maxTimeBetweenInteractions = 2 * min;  // interactions include mouse clicks and tab changes / creation / removal
let maxTimeToKeepTabWithoutInteraction = 2 * min;


function updateInteractionTime() {
  let now = new Date().getTime();
  let lastInteractionTime = JSON.parse(window.localStorage.getItem('lastInteractionTime'));
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));
  let timePassedSinceLastInteraction = now - lastInteractionTime;

  if (timePassedSinceLastInteraction < maxTimeBetweenInteractions) {
    totalInteractionTime += timePassedSinceLastInteraction;
    window.localStorage.setItem('totalInteractionTime', JSON.stringify(totalInteractionTime));
  }
  window.localStorage.setItem('lastInteractionTime', JSON.stringify(new Date().getTime()));
}

function updateTabLastUpdated(tabId, openerTabId) {
  let tabs = JSON.parse(window.localStorage.getItem('tabs'));
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));
  if (!(tabId in tabs)) {
    tabs[tabId] = {};
  }
  tabs[tabId].lastUpdated = totalInteractionTime;
  if (openerTabId !== undefined) {
    tabs[tabId].openedBy = openerTabId;
  }
  window.localStorage.setItem('tabs', JSON.stringify(tabs));
}

function saveTab(tab, preventDuplicates) {
  if (tab === null) {
    return;
  }
  let savedTabs = JSON.parse(window.localStorage.getItem('savedTabs'));
  if (preventDuplicates) {
    savedTabs = savedTabs.filter(t => t.url !== tab.url);
  }
  savedTabs.push(tab);
  window.localStorage.setItem('savedTabs', JSON.stringify(savedTabs));

}

function tabIsClosable(tab) {
  if (tab === undefined) {
    return false;
  }
  if (tab.active) {
    return false;
  }
  if (tab.pinned) {
    return false
  }
  if (tab.audible) {
    return false
  }
  if (tab.url.includes("chrome://newtab")) {
    return false
  }
  return true;
}


function closeOldTabs() {
  let tabs = JSON.parse(window.localStorage.getItem('tabs'));
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));

  let newTabs = {};
  chrome.tabs.query({}, (result) => {
    for (let key in tabs) {
      // close tabs that are old enough
      if (totalInteractionTime - tabs[key].lastUpdated > maxTimeToKeepTabWithoutInteraction) { //7*24*60*60*1000) {
        let tabToClose = result.filter(t => t.id === parseInt(key))[0];
        if (tabIsClosable(tabToClose)) {
          saveTab(tabToClose, true);
          chrome.tabs.remove([tabToClose.id]);
        }

      } else {
        newTabs[key] = tabs[key];
      }
    }
    window.localStorage.setItem('tabs', JSON.stringify(tabs));
  });
}

function tabRemoved(tabId) {
  let tabs = JSON.parse(window.localStorage.getItem('tabs'));
  if (tabId in tabs) {
    delete tabs[tabId];
  }
  window.localStorage.setItem('tabs', JSON.stringify(tabs));
}

chrome.tabs.onCreated.addListener((tab) => {
  // console.log(window.localStorage.getItem('tabs'))
  let openerTabId = tab.openerTabId;
  if (tab.url === "chrome://newtab/") {
    openerTabId = undefined;
  }
  updateTabLastUpdated(tab.id, openerTabId);
  closeOldTabs();

  chrome.storage.local.get('maxTimeToKeepTabWithoutInteraction', result => {
    maxTimeToKeepTabWithoutInteraction = parseInt(result.maxTimeToKeepTabWithoutInteraction) * min;
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateTabLastUpdated(tabId);
  updateInteractionTime();
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  tabRemoved(tabId);
  updateInteractionTime();
});


// removing a tab causes it to activate first, which stores the tabs and then sets them after removing the tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabLastUpdated(activeInfo.tabId);
  updateInteractionTime();
});

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg, sendingPort) {
    updateTabLastUpdated(sendingPort.sender.tab.id);
    updateInteractionTime();
  });
});