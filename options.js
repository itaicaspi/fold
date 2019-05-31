var slider = document.getElementById("myRange");
var output = document.getElementById("value");

chrome.storage.local.get('maxTimeToKeepTabWithoutInteraction', (result) => {
  slider.value = parseInt(result.maxTimeToKeepTabWithoutInteraction);
  output.innerHTML = slider.value + " minutes";
});
// slider.value = JSON.parse(chrome.localStorage.getItem('maxTimeToKeepTabWithoutInteraction'));
 // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
  output.innerHTML = this.value + " minutes";
  chrome.storage.local.set({'maxTimeToKeepTabWithoutInteraction': this.value});
};
//
// let page = document.getElementById('buttonDiv');
// const kButtonColors = ['#3aa757', '#e8453c', '#f9bb2d', '#4688f1'];
// function constructOptions(kButtonColors) {
//   for (let item of kButtonColors) {
//     let button = document.createElement('button');
//     button.style.backgroundColor = item;
//     button.addEventListener('click', function() {
//       chrome.storage.sync.set({color: item}, function() {
//         console.log('color is ' + item);
//       })
//     });
//     page.appendChild(button);
//   }
// }
// constructOptions(kButtonColors);
