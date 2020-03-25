const ws = new WebSocket("ws://fathomless-reaches-81353.herokuapp.com/socket");

ws.onmessage = msg => {
  if (msg.data === "collect") {
    ws.send(localStorage.getItem("tracks") || "[]");
  } else {
    app.run("ontracks", msg.data);
  }
};
if ("geolocation" in navigator) {
  const gotLocation = position => app.run("setGeolocation", position);
  const failedLocation = err => console.error(err);
  navigator.geolocation.getCurrentPosition(gotLocation, failedLocation);
}
const state = {
  grid: [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null]
  ],
  worker: null,
  bar: -1,
  modal: false,
  playedBars: [],
  tracks: [],
  queued_track: [],
  canvas: undefined,
  animation: undefined,
  countryCode: undefined
};
if (!BaseAudio.context) {
  BaseAudio.createContext();
}
let source;
const update = {
  toggle: function(state, rowIndex, cellIndex, element) {
    const freq = [135, 120, 100, 90];
    state.grid[rowIndex][cellIndex] =
      state.grid[rowIndex][cellIndex] === freq[rowIndex]
        ? null
        : freq[rowIndex];
    return state;
  },
  play: function(state) {
    // UNCOMMENT THIS FOR SOME FUNKY BEATS!

    // fetch("Axel_F.mp3")
    //   .then(stream => stream.arrayBuffer())
    //   .then(freq => BaseAudio.context.decodeAudioData(freq))
    //   .then(audio => {
    //     if (source.buffer) {
    //       source.buffer = null;
    //     }
    //     if (!source.buffer) {
    //       source.buffer = audio;
    //     }
    //     source.connect(BaseAudio.analyser);
    //   });

    // UNCOMMENT THIS FOR SOME FUNKY BEATS!
    source = BaseAudio.context.createBufferSource();
    source.connect(BaseAudio.analyser);
    source.start();
    state.animation;
    state.playedBars = [];
    state.worker = new Worker("/worker.js");
    state.worker.onmessage = function(msg) {
      app.run("tick");
    };

    return state;
  },
  tick: function(state) {
    state.bar = state.bar === 7 ? 0 : state.bar + 1;
    const column = state.grid.map(row => {
      return row[state.bar];
    });
    state.grid
      .map(row => row[state.bar])
      .filter(cell => cell)
      .forEach(freq => {
        new Note(freq);
      });
    state.playedBars.push(state.grid.map(row => row[state.bar]));
    return state;
  },
  stop: function(state) {
    source.connect(BaseAudio.analyser);
    source.stop();
    state.worker.terminate();
    state.worker = null;
    state.modal = true;
    state.bar = -1;
    return state;
  },
  dismissModal: function(state) {
    state.modal = false;
    return state;
  },
  save: function(state, form) {
    state.modal = false;
    const data = new FormData(form);
    const track = {
      trackname: data.get("trackname"),
      artist: "Meme Man",
      data: state.playedBars,
      city: "London",
      countryCode: state.countryCode
    };
    state.tracks.push(track);
    localStorage.setItem("tracks", JSON.stringify(state.tracks));
    return state;
  },
  load: function(state, trackindex) {
    const track = state.tracks[trackindex].data;
    let slice = 0;
    const chunked = [];
    while (slice < track.length) {
      chunked.push(track.slice(slice, (slice += 8)));
    }
    while (chunked[chunked.length - 1].length < 8) {
      chunked[chunked.length - 1].push([null, null, null, null]);
    }
    state.queued_track = chunked.map(chunk => {
      return [
        [
          chunk[0][0],
          chunk[1][0],
          chunk[2][0],
          chunk[3][0],
          chunk[4][0],
          chunk[5][0],
          chunk[6][0],
          chunk[7][0]
        ],
        [
          chunk[0][1],
          chunk[1][1],
          chunk[2][1],
          chunk[3][1],
          chunk[4][1],
          chunk[5][1],
          chunk[6][1],
          chunk[7][1]
        ],
        [
          chunk[0][2],
          chunk[1][2],
          chunk[2][2],
          chunk[3][2],
          chunk[4][2],
          chunk[5][2],
          chunk[6][2],
          chunk[7][2]
        ],
        [
          chunk[0][3],
          chunk[1][3],
          chunk[2][3],
          chunk[3][3],
          chunk[4][3],
          chunk[5][3],
          chunk[6][3],
          chunk[7][3]
        ]
      ];
    });
    state.grid = state.queued_track.shift();
    return state;
  },
  ontracks: function(state, tracks) {
    let newtracks = JSON.parse(tracks);
    newtracks.forEach(track => state.tracks.push(track));
    return state;
  },
  setGeolocation: (state, position) => {
    const { latitude, longitude } = position.coords;
    const request = new XMLHttpRequest();
    request.addEventListener("load", function() {
      const city = this.responseXML.getElementsByTagName("city");
      const country_code = this.responseXML.getElementsByTagName(
        "country_code"
      );
      state.city = city[0].textContent;
      state.countryCode = country_code[0].textContent;
      return state;
    });
    request.open(
      "GET",
      `https://eu1.locationiq.com/v1/reverse.php?key=${"pk.3b33a19debbec45ec842b890890c7a6e"}&lat=${latitude}&lon=${longitude}&format=XML`
    );
    request.send();
  }
};
const rendered = state => {
  if (BaseAudio.analyser) {
    let audioArray;
    state.canvas = document.getElementById("canvas");
    state.canvas.setAttribute("width", window.innerWidth / 1.25);
    state.canvas.setAttribute("height", window.innerHeight / 4);
    const w = state.canvas.getAttribute("width");
    const h = state.canvas.getAttribute("height");
    const c = state.canvas.getContext("2d");
    c.fillStyle = "white";

    audioArray = new Uint8Array(BaseAudio.analyser.frequencyBinCount);
    const draw = () => {
      state.animation = requestAnimationFrame(draw);
      BaseAudio.analyser.getByteFrequencyData(audioArray);
      c.clearRect(0, 0, w, h);
      const barWidth = (w / audioArray.length) * 6;
      audioArray.reduce((x, barHeight) => {
        c.fillRect(x, h - barHeight / 1.5, barWidth, barHeight / 1.5);

        return x + barWidth + 1;
      }, 0);
    };
    draw();
  }
};

function test() {
  (function($) {
    $(".off").css({
      "background-color": "red"
    });
  });
}
const viewHeader = `<header>
  <img src="" />
  <h1>Sick Bass App</h1>
</header>`;
let i = 0;
const viewMain = state => `
<canvas id="canvas"></canvas>
<main>
  <section>
  </section>
  <section>
      <article>
      <div class="grid-container">
          ${((i = 0),
          state.grid
            .map((row, rowIndex) => {
              return row
                .map((cell, cellIndex) => {
                  return `<div onclick="app.run('toggle', ${rowIndex}, ${cellIndex}, this)" class="${
                    cell ? "on" : "off"
                  }${cellIndex === state.bar ? "playing" : ""}"></div>`;
                })
                .join("");
            })
            .join(""))}
            </div>
      </article>
  </section>
  <section>
  <nav>
  <button onclick="app.run('play')">Play</button>
  <button class="clickme" onclick="app.run('stop')">Stop</button>
</nav>
</section>
<section>
  ${state.tracks
    .map((track, index) => {
      if (track.trackname.length > 20) {
        track.trackname = track.trackname.substr(0, 17) + "...";
      }
      if (!track.countryCode) {
        track.countryCode = "AQ";
      }
      i++;
      return `<div id="tracks" onclick="app.run('load', ${index})"><img align="right"src="https://www.countryflags.io/${track.countryCode}/flat/64.png"/><p>${i}.${track.trackname} - ${track.artist}</p></div>`;
    })
    .join("")}
  </section>
</main>
`;

const modal = state => `
<section id="modal">
        <form id="modalitem" onsubmit="app.run('save', this); return false;">
          <div id="modaltext">
              <label>Track Name</label>
              <input id="trackname" name="trackname" pattern="[a-zA-Z0-9_]+" title="no special characters" required /><br /><br />
              <button type="reset" onclick="app.run('dismissModal')">Don't Save</button>
              <button type="submit">Save</button>
          </div>
        </form>
</section>`;
const view = state =>
  viewHeader + viewMain(state) + (state.modal ? modal(state) : "");
window.app.start("root", state, view, update, { rendered });
