fetch("https://opensubtitles-v3.strem.io/subtitles/movie/tt1375666.json")
  .then(res => res.json())
  .then(data => console.log(data.subtitles[0]))
  .catch(console.error);
