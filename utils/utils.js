function getCurrentTime() {
  const date = new Date();
  const hour = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();

  minutes = (minutes < 10 ? "0" : "") + minutes;
  seconds = (seconds < 10 ? "0" : "") + seconds;
  return `${hour}:${minutes}:${seconds}`;
}

module.exports = { getCurrentTime };
