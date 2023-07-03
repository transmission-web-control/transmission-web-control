export function enableShortcut() {
  $(window).keydown(function (event) {
    console.log(event);
    if (event.ctrlKey && event.key === 'a') {
      system.control.grid.api?.selectAll();
      event.preventDefault();
    }
  });
}
