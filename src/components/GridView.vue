<template>
  <div class="grid-container" ref="gridContainer">
    <q-infinite-scroll @load="loadMore">
      <div class="albums" v-if="albums.length > 0">
        <q-item-label header>Albums</q-item-label>
        <div class="q-pa-md q-gutter-sm">
          <q-img
            v-for="(album, index) in albums"
            v-bind:key="album.id"
            :class="{ selected: album.selected }"
            @click="selectAlbum(index, $event)"
            class="album-preview stacked"
            v-lazy:background="`${$config.server.base_url}/media/${album.previewId}/thumbnail`"
            spinner-color="primary"
          >
            <div class="absolute-bottom text-subtitle1 text-center q-pa-xs">
              {{ album.name }}
            </div>
            <template v-slot:error>
              <div class="absolute-full flex flex-center text-white">
                No image available
              </div>
            </template>
          </q-img>
        </div>
      </div>

      <div class="media" v-if="layoutBoxes.length > 0">
        <q-item-label header v-if="albums.length > 0">Media</q-item-label>
        <div class="justified-layout-container">
          <q-img
            v-for="(box, index) in layoutBoxes"
            v-bind:key="media[index].id"
            :class="[{ selected: media[index].selected }, `orientation-${media[index].orientation}`]"
            @click="onMediaClick(index, $event)"
            v-touch-hold.mouse="() => selectMedia(index)"
            class="image-preview"
            v-lazy:background="`${$config.server.base_url}/media/${media[index].id}/thumbnail/`"
            spinner-color="primary"
            :style="{
              width: media[index].orientation > 4 ? `${layoutBoxes[index].height}px` : `${layoutBoxes[index].width}px`,
              height: media[index].orientation > 4 ? `${layoutBoxes[index].width}px` : `${layoutBoxes[index].height}px`,
              top: `${layoutBoxes[index].top}px`,
              left: `${layoutBoxes[index].left}px`,
            }"
          >
            <div v-if="media[index].selected" class="icon-overlay absolute-top-left text-subtitle2 text-warning">
              <q-icon name="check_circle" class="cursor-pointer"/>
            </div>
            <div v-if="media[index].mimetype.match(/video\//)" class="icon-overlay absolute-full text-subtitle2 flex flex-center">
              <q-icon name="play_arrow" class="cursor-pointer"/>
            </div>
            <template v-slot:error>
              <div class="absolute-full flex flex-center bg-negative text-white">
                Cannot load image
              </div>
            </template>
          </q-img>
        </div>
      </div>

      <div v-if="layoutBoxes.length === 0 && albums.length === 0" class="absolute-full flex flex-center">
        No media
      </div>
    </q-infinite-scroll>
    <resize-observer @notify="getContainerWidth"></resize-observer>
  </div>
</template>

<script>
import JustifiedLayout from 'justified-layout'
import { ResizeObserver } from 'vue-resize'

export default {
  name: 'PageIndex',

  components: {
    ResizeObserver
  },

  created () {
    this.reset()
  },

  props: {
    currentView: {
      type: String,
      default: 'Albums'
    },
    album: {
      type: Object,
      default: () => {}
    },
    albums: {
      type: Array,
      default: () => []
    },
    media: {
      type: Array,
      default: () => []
    }
  },

  data () {
    return {
      selectedMediaIndex: null,
      selectedAlbumIndex: null,
      selectMode: false,
      selectedMedia: new Set(),
      selectedAlbums: new Set(),
      containerWidth: 0
    }
  },

  mounted () {
    this.getContainerWidth()
  },

  computed: {
    layoutBoxes () {
      let config = JustifiedLayout(this.media, {
        containerWidth: this.containerWidth,
        containerPadding: 10
      })
      return config.boxes
    }
  },

  methods: {
    getContainerWidth () {
      this.containerWidth = this.$refs.gridContainer.clientWidth
    },

    reset () {
      this.$store.commit('media/resetSelection')
      this.selectMode = false
      this.selectedMedia.clear()
      this.$emit('selected', this.selectedMedia)
    },

    loadMore (index, done) {
      setTimeout(() => {
        this.$emit('loadMore', index, done)
      })
    },

    onMediaClick (index, $event) {
      let media = this.media[index]
      if (!(event.ctrlKey || event.shiftKey || event.metaKey) && !this.selectMode) {
        this.$store.commit('media/setIndex', index)
        this.$store.commit('media/setMedia', this.media)
        this.$store.commit('media/setAlbums', this.albums)
        return this.$router.push(`/media/${media.id}`)
      }

      this.selectMedia(index)
    },

    selectMedia (index) {
      let media = this.media[index]

      let selection = []
      if (event && event.shiftKey && this.selectedMediaIndex !== null) {
        let min = Math.min(...[this.selectedMediaIndex, index])
        let max = Math.max(...[this.selectedMediaIndex, index])

        if (this.selectedMediaIndex < index) {
          selection = this.media.slice(min + 1, max + 1)
        } else {
          selection = this.media.slice(min, max)
        }
      } else {
        selection = [media]
        this.selectedMediaIndex = index
      }

      selection.map(target => {
        this.$set(target, 'selected', !target.selected)
        if (target.selected) {
          this.selectedMedia.add(target)
        } else {
          this.selectedMedia.delete(target)
        }
      })

      this.selectMode = this.selectedMedia.size !== 0 || this.selectedAlbums.size !== 0

      this.$emit('selected', this.selectedMedia)
    },

    selectAlbum (index, event) {
      let album = this.albums[index]
      // if (!event.ctrlKey && !this.selectMode) {
      return this.$router.push(`/albums/${album.id}`)
      // }

      // const target = this.media.find(a => a.id === album.id)
      // this.$set(target, 'selected', !target.selected)

      // if (target.selected === true) {
      //   this.selectedMedia.add(album)
      //   this.selectedAlbumIndex = index
      // } else {
      //   this.selectedMedia.delete(album)
      // }

      // this.selectMode = this.selectedMedia.size !== 0 || this.selectedAlbums.size !== 0
    },

    async deleteAlbum () {
      await this.$axios.delete(`${this.$config.server.base_url}/albums/${this.album.id}`)
      this.$router.go(-1)
    },

    doneEditing (updated) {

    }
  }
}
</script>

<style lang="stylus" scoped>
.grid-container
  position relative
  padding-top 50px
  width 100%
  min-height 300px
  -webkit-user-select none
  -moz-user-select none
  -ms-user-select none
  user-select none

.justified-layout-container
  position relative
  width 100%

.album-preview
  border 1px solid black
  width 280px
  height 280px
  background-size cover !important
  background-position 50% 50% !important

.stacked
  // Stacked paper effect
  background: #fff;
  box-shadow:
    0 -1px 1px rgba(0,0,0,0.15), // The top layer shadow
    0 -10px 0 -5px #eee, // The second layer
    0 -10px 1px -4px rgba(0,0,0,0.15), // The second layer shadow
    0 -20px 0 -10px #eee, // The third layer
    0 -20px 1px -9px rgba(0,0,0,0.15); // The third layer shadow

  &:hover
    box-shadow:
      0 -1px 1px rgba(0,0,0,0.35), // The top layer shadow
      0 -10px 0 -5px #ddd, // The second layer
      0 -10px 1px -4px rgba(0,0,0,0.35), // The second layer shadow
      0 -20px 0 -10px #ddd, // The third layer
      0 -20px 1px -9px rgba(0,0,0,0.35); // The third layer shadow

.image-preview
  position absolute
  border 1px solid black
  background-size cover !important
  background-position 50% 50% !important

  .icon-overlay
    background rgba(0, 0, 0, 0) !important

  .q-icon
    font-size 3em

.selected
  border $warning 5px solid

.orientation-2
  transform rotateY(180deg)

.orientation-3
  transform rotate(180deg)

.orientation-4
  transform rotate(180deg) rotateY(180deg)

.orientation-5
  transform rotate(270deg) rotateY(180deg)
  transform-origin top left

.orientation-6
  transform translateY(-100%) rotate(90deg)
  transform-origin bottom left

.orientation-7
  transform translateY(-100%) translateX(-100%) rotate(90deg) rotateY(180deg)
  transform-origin bottom right

.orientation-8
  transform translateX(-100%) rotate(270deg)
  transform-origin top right
</style>
