
var port = chrome.runtime.connect({name: "knockknock"});

document.addEventListener('click', function (e) {
  port.postMessage({});
});

document.addEventListener('wheel', function (e) {
  port.postMessage({});
});
