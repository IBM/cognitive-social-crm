// NOT GOOD! Need to find the right angular hook!
// Problem is the scroll is occurring before the messages are rendered.
// Maybe need to emit an event when it is rendered and redraw then?
function scrollToBottomOfChat() {
  setTimeout(() => {
    let container = document.getElementById('scrolling-chat-box')
    container.scrollTop = container.scrollHeight
  }, 100)
}

export {scrollToBottomOfChat}
