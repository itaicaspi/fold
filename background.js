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
  // window.localStorage.setItem('totalDomainInteractionTimes', JSON.stringify({}));

});

const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;
const week = 7 * day;
const month = 31 * day;
const year = 365 * day;

var lastUpdatedTab = 0;
var lastActiveTab = 0;

const maxTimeBetweenInteractions = 2 * min;  // interactions include mouse clicks and tab changes / creation / removal
let maxTimeToKeepTabWithoutInteraction = 2 * min;


function getDomain(url) {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.log(url);
    return undefined;
  }
}

function updateDomainInteractionTime(domain, interactionTime) {
  let totalDomainInteractionTimes = JSON.parse(window.localStorage.getItem('totalDomainInteractionTimes'));
  totalDomainInteractionTimes = totalDomainInteractionTimes ? totalDomainInteractionTimes : {};
  if (domain in totalDomainInteractionTimes) {
    totalDomainInteractionTimes[domain].push(interactionTime);
  } else {
    totalDomainInteractionTimes[domain] = [interactionTime];
  }
  window.localStorage.setItem('totalDomainInteractionTimes', JSON.stringify(totalDomainInteractionTimes));
}


function updateInteractionTime() {
  let now = new Date().getTime();
  let lastInteractionTime = JSON.parse(window.localStorage.getItem('lastInteractionTime'));
  lastInteractionTime = lastInteractionTime ? lastInteractionTime : 0;
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));
  totalInteractionTime = totalInteractionTime ? totalInteractionTime : 0;
  let timePassedSinceLastInteraction = now - lastInteractionTime;

  if (timePassedSinceLastInteraction < maxTimeBetweenInteractions) {
    totalInteractionTime += timePassedSinceLastInteraction;
    window.localStorage.setItem('totalInteractionTime', JSON.stringify(totalInteractionTime));
  }
  window.localStorage.setItem('lastInteractionTime', JSON.stringify(new Date().getTime()));
}

function updateTabLastUpdated(tabId, openerTabId, url) {
  let tabs = JSON.parse(window.localStorage.getItem('tabs'));
  tabs = tabs ? tabs : {};
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));
  totalInteractionTime  = totalInteractionTime ? totalInteractionTime : 0;
  if (!(tabId in tabs)) {
    tabs[tabId] = {};
  }

  // update domain interaction time
  let now = new Date().getTime();
  let lastInteractionTime = JSON.parse(window.localStorage.getItem('lastInteractionTime'));
  lastInteractionTime = lastInteractionTime ? lastInteractionTime : 0;
  if (getDomain(url) === getDomain(tabs[tabId].lastUrl)) {
    tabs[tabId].currentDomainInteractionTime += now - lastInteractionTime;
  } else {
    updateDomainInteractionTime(getDomain(tabs[tabId].lastUrl), tabs[tabId].currentDomainInteractionTime);
    tabs[tabId].currentDomainInteractionTime = 0;
  }

  tabs[tabId].lastUpdated = totalInteractionTime;
  tabs[tabId].lastUrl = url;

  if (openerTabId !== undefined) {
    tabs[tabId].openedBy = openerTabId;
  }
  window.localStorage.setItem('tabs', JSON.stringify(tabs));

  // close the tabs viewer on the last tab if it is present
  chrome.tabs.getCurrent((tab) => {
    if (tab.id !== lastActiveTab) {
      chrome.tabs.sendMessage(lastActiveTab, {action: "hideTabs"}, function(response) {});
    }
    lastActiveTab = tab.id;
  });

  if (!(tabId in openTabs)) {
    chrome.tabs.get(tabId, (tab) => {
      openTabs[tabId] = {"screen": "", "tab": tab};
    });
    chrome.tabs.sendMessage(tabId, {action: "getScreen", tabId: tabId}, function(response) {});
  }

  lastUpdatedTab = tabId;
}

function saveTab(tab, preventDuplicates) {
  if (tab === null) {
    return;
  }
  let savedTabs = JSON.parse(window.localStorage.getItem('savedTabs'));
  savedTabs = savedTabs ? savedTabs : [];
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
  return false; // TODO: remove
  return true;
}


function closeOldTabs() {
  let tabs = JSON.parse(window.localStorage.getItem('tabs'));
  tabs = tabs ? tabs : {};
  let totalInteractionTime = JSON.parse(window.localStorage.getItem('totalInteractionTime'));
  totalInteractionTime = totalInteractionTime ? totalInteractionTime : 0;

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
  tabs = tabs ? tabs : {};
  updateDomainInteractionTime(getDomain(tabs[tabId].lastUrl), tabs[tabId].currentDomainInteractionTime);
  if (tabId in tabs) {
    delete tabs[tabId];
  }
  window.localStorage.setItem('tabs', JSON.stringify(tabs));

  if (tabId in openTabs) {
    delete openTabs[tabId];
    chrome.tabs.getCurrent(activeTab => {
      chrome.tabs.sendMessage(activeTab.id, {action: "refreshTabs", data: openTabs, tabId: activeTab.id}, function(response) {});
    })
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  // console.log(window.localStorage.getItem('tabs'))
  let openerTabId = tab.openerTabId;
  if (tab.url === "chrome://newtab/") {
    openerTabId = undefined;
  }
  updateTabLastUpdated(tab.id, openerTabId, tab.url);
  closeOldTabs();

  chrome.storage.local.get('maxTimeToKeepTabWithoutInteraction', result => {
    maxTimeToKeepTabWithoutInteraction = parseInt(result.maxTimeToKeepTabWithoutInteraction) * min;
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateTabLastUpdated(tabId, undefined, tab.url);
  updateInteractionTime();
  console.log(changeInfo.status);
  if (changeInfo.status === "complete") {
    console.log("getScreen")
    chrome.tabs.sendMessage(tabId, {action: "getScreen", tabId: tabId}, function(response) {});
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  tabRemoved(tabId);
  updateInteractionTime();
});


// removing a tab causes it to activate first, which stores the tabs and then sets them after removing the tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.query({active: true}, result => {
    updateTabLastUpdated(activeInfo.tabId, undefined, result[0].url);
  });
  updateInteractionTime();
});

var openTabs = {};
chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg, sendingPort) {
    if ('screen' in msg) {
      // receive a screen image from the tab content script
      // console.log(msg['tabId'], msg['screen']);
      chrome.tabs.captureVisibleTab(null, {format: "png"}, (screen) => {
        msg['screen'] = screen;
        console.log(msg['tabId'], msg['screen']);
        chrome.tabs.get(msg['tabId'], (tab) => {
          openTabs[msg['tabId']] = {
            'screen': msg['screen'],
            'tab': tab
          };
        });
      });

    } else if ('switchTab' in msg) {
      // switch the active tab to the given tab
      console.log("switchTab", msg['switchTab']);
      chrome.tabs.update(msg['switchTab'], {active: true});

    } else if ('addTab' in msg) {
      chrome.tabs.create({active: false}, (tab) => {
        openTabs[tab.id] = {"screen": "", "tab": tab};
        chrome.tabs.sendMessage(tab.id, {action: "getScreen", tabId: tab.id}, function(response) {});
        chrome.tabs.sendMessage(msg['tabId'], {action: "refreshTabs", data: openTabs, tabId: tab.id}, function(response) {});
      });
    } else if ('closeTab' in msg) {
      // close the given tab
      console.log("closeTab", msg['closeTab']);

      // if the current tab was closed, we need to open the tabs view in the next tab
      chrome.tabs.query({currentWindow: true, active : true}, (tabs) => {
        var shouldReopenTabView = tabs[0] && tabs[0].id === msg['closeTab'];
        chrome.tabs.remove(msg['closeTab']);
        delete openTabs[msg['closeTab']];

        if (shouldReopenTabView) {
          console.log("should reopen")
          chrome.tabs.query({currentWindow: true, active : true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "showTabs", data: openTabs, tabId: tabs[0].id}, function (response) {});
          });
        }
      });

    } else if ('getTabs' in msg) {
      console.log(openTabs);

      // send all the tab openTabs to the active tab content script
      chrome.tabs.query({currentWindow: true, active : true}, (tabs) => {
        if (tabs[0]) {
          console.log(openTabs);
          chrome.tabs.sendMessage(tabs[0].id, {action: "showTabs", data: openTabs, tabId: tabs[0].id}, function(response) {});
        }
      });
    } else {
      updateTabLastUpdated(sendingPort.sender.tab.id, undefined, sendingPort.sender.tab.url);
      updateInteractionTime();
    }
  });
});
