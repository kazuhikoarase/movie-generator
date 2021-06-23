//
// movie-generator
//
// Copyright (c) 2021 Kazuhiko Arase
//
// URL: https://github.com/kazuhikoarase/movie-generator
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

'use strict'
!function() {

  var components = {};

  components.movie = {
    template: '<div class="movie-frame">' +
      '<div :style="canvasHolderStyle" style="position: relative;">' +
        '<canvas ref="bg" style="position: absolute;"' +
          ' :width="width" :height="height"></canvas>' +
        '<canvas ref="cv" style="position: absolute;"' +
          ' :width="width" :height="height"></canvas>' +
      '</div>' +
      '<div :title="info">' +
        '<div>' +
          '<input type="range" min="0" :max="numFrames - 1"' +
            ' v-model="currentFrame" :style="timeRangeStyle" />' +
        '</div>' +
        '<div>' +
          '<button style="width: 50px;"' +
            ' @click="currentFrame = 0"> {{ labels.rew }} </button> ' +
          '<button style="width: 50px;"' +
            ' @click="playing = !playing; if (playing) { play() }"' +
            '> {{playing? labels.stop : labels.play }} </button>' +
          ' <label><input type="checkbox" v-model="loop"' +
            '/>{{labels.loop}}</label>' +
          ' <button style="float:right;" @click="download_clickHandler"' +
            '> {{ labels.download }} </button>' +
        '</div>' +
        '<div v-if="statusBar">' +
          '{{ labels.frameNumber }}: ' +
            '<span style="width:60px; display:inline-block;">' +
              '{{ frameNumber }}</span>' +
          '{{ labels.time }}: ' +
            '<span>{{ currentTime }}</span>' +
        '</div>' +
      '</div>' +
    '</div>',
    props: {
      width: { type: Number, default: 400 },
      height: { type: Number, default: 300 },
      numFrames: { type: Number, default: 72 },
      frameRate: { type: Number, default: 24 },
      scale: { type: Number, default: 1 },
      loop: { type: Boolean, default: true },
      autoPlay: { type: Boolean, default: false },
      statusBar: { type: Boolean, default: true },
      name: { type: String, default: 'untitled-movie' }
    },
    data: function() {
      return {
        currentFrame: 0,
        playing: false,
        labels: {
          frameNumber: 'FrameNumber',
          time: 'Time',
          play: 'Play',
          stop: 'Stop',
          rew: 'Rew',
          loop: 'Loop',
          download: 'Download Images'
        }
      };
    },
    watch: {
      currentFrame: function(currentFrame) {
        this.render(this.$refs.cv.getContext('2d'), +currentFrame);
      },
      bgParams: function() {
        this.renderBackground();
      }
    },
    computed: {
      info: function() {
        return this.width + 'x' + this.height +
          ' ' + this.frameRate + 'fps' +
          ' ' + this.numFrames + 'frames' +
          ' ' + formatTime(this.numFrames / this.frameRate);
      },
      frameNumber: function() {
        return +this.currentFrame + 1;
      },
      currentTime: function() {
        return formatTime(this.currentFrame / this.frameRate);
      },
      timeRangeStyle: function() {
        return {
          width: ~~(this.width * this.scale) + 'px',
          margin: '0px'
        };
      },
      canvasHolderStyle: function() {
        return {
          transformOrigin : 'top left',
          transform: 'scale(' + this.scale + ')',
          width: (this.width * this.scale) + 'px',
          height: (this.height * this.scale) + 'px'
        };
      },
      bgParams: function() {
        return [ this.width, this.height, this.scale ];
      }
    },
    methods: {
      play: function() {

        var play = function(time) {
          if (startTime == 0) {
            startTime = time;
          }
          var frame = Math.floor(this.frameRate *
            (time - startTime) / 1000) + startFrame;
          if (this.numFrames <= frame) {
            if (this.loop) {
              this.currentFrame = frame % this.numFrames;
            } else {
              this.currentFrame = this.numFrames - 1;
              this.playing = false;
            }
          } else if (this.currentFrame != frame) {
            this.currentFrame = frame;
          }
          if (this.playing) {
            window.requestAnimationFrame(play);
          }
        }.bind(this);

        var startTime = 0;
        var startFrame = +this.currentFrame;
        window.requestAnimationFrame(play);
      },
      render: function(ctx, currentFrame) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.$emit('render', ctx, {
          currentFrame: currentFrame,
          width: this.width,
          height: this.height,
          numFrames: this.numFrames,
          frameRate: this.frameRate
        });
      },
      renderBackground: function() {
        var pattern = function() {
          var ctx = document.createElement('canvas').getContext('2d');
          var size = 8;
          size = Math.max(1, ~~( (size / this.scale) / size ) ) * size;
          ctx.canvas.width = size * 2;
          ctx.canvas.height = size * 2;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, size, size);
          ctx.fillRect(size, size, size, size);
          ctx.fillStyle = '#ccc';
          ctx.fillRect(0, size, size, size);
          ctx.fillRect(size, 0, size, size);
          return ctx.canvas;
        }.bind(this)();

        var ctx = this.$refs.bg.getContext('2d');
        //ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = ctx.createPattern(pattern, 'repeat');
        ctx.fillRect(0, 0, this.width, this.height);
      },
      download_clickHandler: function() {

        var ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = this.width;
        ctx.canvas.height = this.height;

        var currentFrame = 0;
        var zip = new JSZip();

        var putFile = function() {
          if (currentFrame < this.numFrames) {
            this.render(ctx, currentFrame);
            ctx.canvas.toBlob(function(data) {
              var seq = '' + (currentFrame + 1);
              while (seq.length < 6) {
                seq = '0' + seq;
              }
              var filename = this.name + seq + '.png';
              zip.file(filename, data);
              currentFrame += 1;
              if (currentFrame % 10 == 0) {
                console.log(filename + ' created');
              }
              putFile();
            }.bind(this) );
          } else {
            var filename = this.name + '.zip';
            zip.generateAsync({type: 'blob'}).then(function(content) {
              saveAs(content, filename);
            });
          }

        }.bind(this);

        putFile();
      }
    },
    mounted: function() {

      this.render(this.$refs.cv.getContext('2d'), +this.currentFrame);
      this.renderBackground();

      if (this.autoPlay) {
        this.playing = true;
        this.play();
      }
    }
  };

  components.timeconv = {
    template: '<div' +
        ' style="display:inline-block;white-space:nowrap;">' +
      '<input type="text" v-model="time"' +
      ' style="width:60px;text-align:right;" /> {{formatted}}' +
    '</div>',
    data: function() {
      return {
        time: 0
      };
    },
    computed: {
      formatted: function() {
        return formatTime(+this.time);
      }
    }
  }

  var formatTime = function() {
    var d2 = function(n) {
      var s = '' + n;
      if (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return function(time) {
      var t = Math.floor(time * 60);
      var tc = d2(t % 60);
      t = Math.floor(t / 60);
      tc = d2(t % 60) + ':' + tc;
      t = Math.floor(t / 60);
      tc = d2(t % 60) + ':' + tc;
      t = Math.floor(t / 60);
      tc = d2(t) + ':' + tc;
      return tc;
    };
  }();

  !function() {
    for (var name in components) {
      Vue.component(name, components[name]);
    }
  }();

}();
