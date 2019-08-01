var port = chrome.runtime.connect({name: "knockknock"});

document.addEventListener('click', function (e) {
  port.postMessage({});
});

document.addEventListener('wheel', function (e) {
  port.postMessage({});
});

chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
  var foldTabs = $("#foldTabs");
  if (msg.action === 'getScreen') {
    // capture tab screen and send to background script
    // try {
    //   html2canvas(document.querySelector("body")).then(canvas => {
    //     port.postMessage({'screen': canvas.toDataURL('image/png'), 'tabId': msg.tabId});
    //   });
    // } catch (e) {
    //   port.postMessage({'screen': "", 'tabId': msg.tabId});
    // }
    port.postMessage({'screen': "", 'tabId': msg.tabId});

  } else if (msg.action === "hideTabs") {
    console.log("background script requested hide tabs");
    hideTabs();
  } else if (msg.action === "showTabs") {
    console.log("background script requested show tabs");

    // overlay the current open tabs
    if ('data' in msg) {
      if (tabsViewIsOpen()) {
        hideTabs();
      } else {
        // show open tabs
        showTabs(msg.data, msg.tabId);
      }
    } else {
      // request data from background script
      port.postMessage({'getTabs': {}});
    }
  } else if (msg.action === "refreshTabs") {
    refreshTabs(msg.data, msg.tabId);
  }
});

function tabsViewIsOpen() {
  var foldTabs = $("#foldTabs");
  return foldTabs.length;
}

function refreshTabs(data, currentTabId) {
  if (tabsViewIsOpen()) {
    hideTabs();
    showTabs(data, currentTabId);
  }
}

function hideTabs() {
  console.log("hideTabs");

  $("body").removeClass("blurredBody");
  var foldTabs = $("#foldTabs");
  if (foldTabs.length) {
    foldTabs.remove();
  }
}

function showTabs(data, currentTabId) {
  console.log("showTabs");

  $("body").addClass("blurredBody");

  // setup tabs container
  var tabsDiv = document.querySelector("#foldTabs");
  if (tabsDiv) {
    $(".foldTabScreen").remove();
  } else {
    tabsDiv = document.createElement('div');
    tabsDiv.setAttribute("id", "foldTabs");
    document.body.append(tabsDiv);
    var foldTabs = $("#foldTabs");

    // close if background clicked
    foldTabs.click(() => {
      console.log('foldTabs was clicked');
      return hideTabs();
    });

    // add button
    var addButtonSpan = $("<span id='addTabButton' class='globalButton'></span>");
    addButtonSpan.click(() => {
      port.postMessage({'addTab': currentTabId, 'tabId': currentTabId});
      return false;
    });
    foldTabs.append(addButtonSpan);
    $("#addTabButton").append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\"><path d=\"M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z\"></path></svg>")

    // close button
    var closeButtonSpan = $("<span id='closeTabsContainerButton' class='globalButton'></span>");
    closeButtonSpan.click(() => {
      console.log('closeButtonSpan was clicked');
      return hideTabs();
    });
    foldTabs.append(closeButtonSpan);
    $("#closeTabsContainerButton").append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 352 512\"><path d=\"M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z\"></path></svg>");

    // needs to be added after the close button
    foldTabs.append("<div id='tabsContainer'></div>");
  }
  var tabsContainer = $("#tabsContainer");

  // create all tabs
  const sortedTabs = Object.entries(data).filter(t => t[1]['tab']).sort((a, b) => a[1]['tab'].index - b[1]['tab'].index);
  for (var tabIdx in sortedTabs) {
    const tabKey = sortedTabs[tabIdx][0];
    const tabValue = sortedTabs[tabIdx][1];

    const foldTab = $("<div class='foldTab'></div>");
    tabsContainer.append(foldTab);
    const intTabIdx = parseInt(tabKey);
    foldTab.click(() => {
      console.log('foldTab was clicked');
      port.postMessage({'switchTab': intTabIdx});
      hideTabs();
    });

    // tab title
    let favIconUrl = "";
    if (tabValue['tab'].favIconUrl) {
      favIconUrl = tabValue['tab'].favIconUrl;
      foldTab.append('<div class="foldTabTitle"><img src="' + favIconUrl + '" class="foldTabFavIcon"><span class="foldTabTitleText">' + tabValue['tab'].title + '</span></div>');
    } else {
      foldTab.append('<div class="foldTabTitle"><span class="foldTabTitleText">' + tabValue['tab'].title + '</span></div>');
    }

    // tab screen container (to prevent image overflow)
    let foldTabScreen;
    console.log(tabKey, currentTabId)
    if (intTabIdx === currentTabId) {
      foldTabScreen = $("<div class='foldTabScreen foldActiveTab'></div>");
    } else {
      foldTabScreen = $("<div class='foldTabScreen'></div>");
    }
    foldTab.append(foldTabScreen);

    // close button
    const tabCloseButtonSpan = $("<span class='closeTab'></span>");
    tabCloseButtonSpan.click((e) => {
      e.preventDefault();
      port.postMessage({'closeTab': intTabIdx});
      foldTab.remove();
      return false;
    });
    foldTabScreen.append(tabCloseButtonSpan);
    tabCloseButtonSpan.append("<svg xmlns=\"http://www.w3.org/2000/svg\" style='fill: white' viewBox=\"0 0 20 20\"><title>Close</title><path d=\"M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z\"/></svg>")

    // add image to tab view
    const img = document.createElement( 'img');
    img.src = tabValue['screen'];
    foldTabScreen.append(img);
  }
}

function updateTitle() {
  document.title = document.title.substring(1) + document.title.substring(0, 1);
  setTimeout(updateTitle, 300);
}

$(document).keyup(function(e) {
  if (e.key === "Escape") {
    hideTabs();
  }
});
// window.onload = function() {
  // var favicon = document.querySelector("link[rel*='shortcut icon']") || document.createElement('link');
  // // var favicon = document.getElementById('favicon');
  // console.log(favicon)
  // document.title = document.title + " ";
  // setTimeout(updateTitle, 300);
  // var faviconSize = 16;
  // // favicon.setAttribute('crossOrigin', 'anonymous')
  //
  // var canvas = document.createElement('canvas');
  // canvas.width = faviconSize;
  // canvas.height = faviconSize;
  //
  // var context = canvas.getContext('2d');

  // img.setAttribute('crossOrigin', 'annonymous')
  // img.src = favicon.href;
  //
  //
  // img.onload = () => {
  //   // Draw Original Favicon as Background
  //   context.drawImage(img, 0, 0, faviconSize, faviconSize);
  //
  //   // Draw Notification Circle
  //   context.beginPath();
  //   context.arc( canvas.width - faviconSize/3 , faviconSize/3, faviconSize / 3, 0, 2*Math.PI);
  //   context.fillStyle = '#FF0000';
  //   context.fill();
  //   // context.strokeStyle = '#FF0000';
  //   // context.stroke();
  //
  //   // Draw Notification Number
  //   // context.font = '10px sans-serif';
  //   // context.textAlign = "center";
  //   // context.textBaseline = "middle";
  //   // context.fillStyle = '#FFFFFF';
  //   // context.fillText(3, canvas.width - faviconSize / 4, faviconSize / 4);
  //
  //   // Replace favicon
  //   favicon.href = canvas.toDataURL('image/png');
  // };
  // var img = document.createElement('img');
  // document.body.appendChild(img);
  // html2canvas(document.querySelector("body")).then(canvas => {
  //   console.log(canvas);
  //   img.src = canvas.toDataURL('image/png');
  //   port.postMessage({'screen': img.src});
  //   // document.body.appendChild(canvas);
  // });

// };

