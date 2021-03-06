const express = require('express')
const router = express.Router()
const { Album, Media } = require('../../models/index')
const wrap = require('../middleware/routeWrapper')
const passport = require('passport')

/**
 * Get all albums
 */
router.get('/', wrap(async (req, res, next) => {
  let filter = null
  try {
    filter = JSON.parse(req.query.filter)
  } catch (e) {}

  let albums = await Album.findAll({
    where: {
      ...filter,
      ...!req.user && { public: 1 }
    },
    include: [
      {
        model: Media,
        as: 'media'
      }
    ]
  })

  return res.json(albums)
}))

/**
 * Get an album
 */
router.get('/:id', wrap(async (req, res, next) => {
  let album = await Album.findOne({
    where: {
      id: req.params.id,
      ...!req.user && { public: 1 }
    },
    include: {
      model: Album,
      as: 'children'
    }
  })

  return res.json(album)
}))

/**
 * Get an album's media
 */
router.get('/:id/media', wrap(async (req, res, next) => {
  let album = await Album.findOne({
    where: {
      id: req.params.id,
      ...!req.user && { public: 1 }
    }
  })

  let media = await album.getMedia({
    limit: 50,
    order: Media.buildOrderQuery(req.query.sortMode, req.query.order),
    offset: req.query.offset || 0,
    where: {
      ...!req.user && { public: 1 }
    }
  })

  return res.json(media)
}))

/**
 * Create a new album
 */
router.post('/', passport.authenticate('jwt', { session: false }), wrap(async (req, res, next) => {
  let album = await Album.create({
    name: req.body.name,
    description: req.body.description
  })

  if (req.body.parentId) {
    album.setParent(req.body.parentId)
  }

  return res.json(album)
}))

router.put('/:id', passport.authenticate('jwt', { session: false }), wrap(async (req, res, next) => {
  await Album.update(req.body, {
    where: {
      id: req.params.id
    }
  })

  let album = await Album.findByPk(req.params.id)

  return res.json(album)
}))

/**
 * Delete an entire album
 */
router.delete('/:ids', passport.authenticate('jwt', { session: false }), wrap(async (req, res, next) => {
  let ids = req.params.ids.split(',')
  await Album.destroy({
    where: {
      id: ids
    }
  })

  return res.json([])
}))

/**
 * Add media to an album
 */
router.put('/:id/media/:media_ids', passport.authenticate('jwt', { session: false }), wrap(async (req, res, next) => {
  let album = await Album.findOne({
    where: {
      id: req.params.id
    },
    include: [
      {
        model: Media,
        as: 'media'
      }
    ]
  })

  let ids = new Set([...album.media.map(m => m.id), ...req.params.media_ids.split(',').map(id => parseInt(id))])
  await album.setMedia([...ids])

  await album.setPreview(ids.values().next().value)

  album = await Album.findOne({
    where: {
      id: album.id
    }
  })

  return res.json(album)
}))

/**
 * Remove media from an album
 */
router.delete('/:id/media/:media_ids', passport.authenticate('jwt', { session: false }), wrap(async (req, res, next) => {
  let album = await Album.findOne({
    where: {
      id: req.params.id
    }
  })

  await album.removeMedia(req.params.media_ids.split(','))

  return res.json(album)
}))

module.exports = router
