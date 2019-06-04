let savedTabsContainer = document.getElementById('savedTabs');

function createTab(url) {
  chrome.tabs.create({url: url});
}

function removeTab(tabId) {
  let savedTabs = JSON.parse(window.localStorage.getItem('savedTabs'));
  savedTabs = savedTabs.filter(t => t.id !== tabId);
  window.localStorage.setItem('savedTabs', JSON.stringify(savedTabs));
}

const maxTitleLength = 30;

function populateTabs() {
  let savedTabs = JSON.parse(window.localStorage.getItem('savedTabs'));
  savedTabs = savedTabs ? savedTabs : [];
  savedTabsContainer.innerHTML = "";
  if (savedTabs.length === 0) {
    savedTabsContainer.innerHTML = "<h4>Nothing here</h4>";
  }
  for (let i = savedTabs.length - 1; i >= 0; i--) {
    let tab = savedTabs[i];
    if (tab !== null) {
      let template = document.querySelector('#tabRow');
      let content = document.importNode(template.content, true);
      let tabDiv = content.querySelector("div");
      let favIcon = content.querySelector("img");
      let link = content.querySelector("a");
      let xIcon = content.querySelector(".x-icon");
      favIcon.src = tab.favIconUrl;
      if (tab.title.length > maxTitleLength) {
        link.innerText = tab.title.slice(0, maxTitleLength - 3) + "...";
      } else {
        link.innerText = tab.title;
      }
      link.title = tab.url;
      tabDiv.title = tab.url;
      tabDiv.onclick = () => {createTab(tab.url); removeTab(tab.id); populateTabs()};
      xIcon.onclick = (e) => {removeTab(tab.id); populateTabs(); e.stopPropagation()};
      savedTabsContainer.appendChild(content);
    }
  }
}

populateTabs();

//
// let changeColor = document.getElementById('changeColor');
// let price = document.getElementById('price');
//
// chrome.storage.local.get('color', function(data) {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
// });
//
// changeColor.onclick = function(element) {
//   let color = element.target.value;
//
//   function modifyDOM() {
//     //You can play with your DOM here or check URL against your regex
//     console.log('Tab script:');
//     console.log(document.body);
//     return document.body.innerHTML;
//   }
//
//
//   function modifyPrice() {
//     //You can play with your DOM here or check URL against your regex
//     return document.getElementById('priceblock_ourprice').innerHTML = "10";
//   }
//
//   price.innerText = 'hello';
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     console.log(tabs[0]);
//     // chrome.tabs.executeScript(
//     //   tabs[0].id,
//     //   {code: '(' + modifyDOM + ')();'},
//     //   result => {
//     //     console.log(result[0])
//     //   }
//     // );
//
//     chrome.tabs.executeScript(
//       tabs[0].id,
//       {code: '(' + modifyPrice + ')();'},
//       result => {
//         console.log(result)
//       }
//     )
//     // chrome.tabs.executeScript(
//     //   tabs[0].id,
//     //   {code: 'document.body.style.backgroundColor = "' + color + '";'});
//   });
// };
