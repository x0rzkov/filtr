<template>
  <q-page>
    <album-editor ref="albumEditor" @close="getData"></album-editor>
    <album-selector ref="albumSelector" @selected="addToAlbum"></album-selector>
    <media-editor ref="mediaEditor" :media="selectedMedia"></media-editor>
    <confirm ref="confirmRemoveImages" :message="'Remove images from album?'" @confirm="removeFromAlbum"></confirm>
    <confirm ref="confirmDeleteAlbum" :message="'Really delete album?'" @confirm="deleteAlbum"></confirm>

    <grid-view
      ref="gridView"
      :media="media"
      :albums="albums"
      @loadMore="getData"
      @selected="selected"
    ></grid-view>

    <q-page-sticky expand position="top">
      <q-toolbar class="bg-grey-3">
        <top-level-nav v-if="!selectMode"></top-level-nav>

        <sort-nav v-if="!selectMode" @sort="sort"></sort-nav>

        <q-btn flat v-if="selectMode" @click="$refs.gridView.reset()">
          <q-icon name="close"></q-icon>DESELECT ALL
        </q-btn>

        <q-breadcrumbs>
          <q-breadcrumbs-el
            to="/albums"
            label="Albums"
          />
          <q-breadcrumbs-el
            v-for="item in lineage"
            :key="item.id"
            :label="item.name"
            :to="item.url"
            icon="photo_album"
          />
        </q-breadcrumbs>

        <q-toolbar-title></q-toolbar-title>

        <div v-if="$store.getters['users/isLoggedIn']">
          <q-btn flat round dense @click="$refs.albumEditor.open()">
            <q-icon name="add_to_photos"></q-icon>
          </q-btn>

          <q-btn flat round dense @click="$refs.albumEditor.open(album)">
            <q-icon name="edit"></q-icon>
          </q-btn>

          <q-btn v-if="album" flat round dense @click="$refs.confirmDeleteAlbum.open()">
            <q-icon name="delete"></q-icon>
          </q-btn>

          <q-btn flat round dense icon="more_vert" v-if="selectMode">
            <q-menu>
              <q-list style="min-width: 150px">
                <q-item clickable v-close-popup>
                  <q-item-section @click="$refs.mediaEditor.open()">Edit</q-item-section>
                </q-item>
                <q-item clickable v-close-popup>
                  <q-item-section @click="$refs.albumSelector.open()">Add to album...</q-item-section>
                </q-item>
                <q-item clickable v-close-popup v-if="!!album">
                  <q-item-section @click="$refs.confirmRemoveImages.open()">Remove from album</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-page-sticky>
  </q-page>
</template>

<style>
</style>

<script>
import GridView from '../components/GridView'
import AlbumEditor from '../components/dlg/AlbumEditor'
import AlbumSelector from '../components/dlg/AlbumSelector'
import Confirm from '../components/dlg/Confirm'
import MediaEditor from '../components/dlg/MediaEditor'
import TopLevelNav from '../components/TopLevelNav'
import SortNav from '../components/SortNav'

import GridViewWatcher from '../mixins/GridViewWatcher'
import GridViewState from '../mixins/GridViewState'

export default {
  name: 'AlbumIndex',

  components: {
    GridView,
    AlbumEditor,
    AlbumSelector,
    Confirm,
    MediaEditor,
    TopLevelNav,
    SortNav
  },

  mixins: [
    GridViewWatcher,
    GridViewState
  ],

  computed: {
    lineage () {
      return this.$store.getters['albums/getAlbumLineage'](this.$route.params.id)
    }
  },

  created () {
    this.albumUrl = `${this.$config.server.base_url}/albums/${this.$route.params.id}`
    this.mediaUrl = `${this.$config.server.base_url}/albums/${this.$route.params.id}/media/`
  },

  methods: {
    sort (config) {
      this.media = []
      this.$store.commit('media/setMedia', [])
      this.getData()
    },

    async deleteAlbum () {
      await this.$axios.delete(this.albumUrl)
      this.$store.commit('albums/deleteAlbum', this.album)
      this.$store.dispatch('albums/fetchAlbums')
      this.$router.go(-1)
    },

    async removeFromAlbum () {
      let selectedIds = [...this.selectedMedia].map(m => m.id)
      await this.$axios.delete(`${this.$config.server.base_url}/albums/${this.album.id}/media/${selectedIds.join(',')}`)
      this.media = this.media.filter(m => !selectedIds.includes(m.id))
      this.$emit('updatedAlbum')
    }
  }
}
</script>
