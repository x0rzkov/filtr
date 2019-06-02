'use strict'

const Sequelize = require('sequelize')
const fs = require('fs')
const path = require('path')

/**
 * required for processing GIF thumbnails
 */
// const { execFileSync } = require('child_process')
// const gifsicle = require('gifsicle')

/**
 * for handling normal images
 */
const sharp = require('sharp')

/**
 * for creating thumbnail (screenshot) for videos
 */
const ffmpeg = require('fluent-ffmpeg')

/**
 * for determining file mimetype
 */
const mmmagic = require('mmmagic')
const Magic = require('mmmagic').Magic

class Media extends Sequelize.Model {
  static init (sequelize, DataTypes) {
    return super.init({
      path: DataTypes.STRING,
      name: DataTypes.STRING,
      description: DataTypes.STRING,
      width: DataTypes.INTEGER,
      height: DataTypes.INTEGER,
      mimetype: DataTypes.STRING,
      size: DataTypes.INTEGER,
      checksum: DataTypes.STRING,
      lastModified: DataTypes.DATE
    }, { sequelize })
  }

  static associate (models) {
    this.belongsToMany(models.Album, {
      through: 'media_to_albums',
      foreignKey: 'mediaId',
      as: 'albums'
    })

    this.belongsToMany(models.Tag, {
      through: 'media_to_tags',
      foreignKey: 'mediaId',
      as: 'tags'
    })

    this.belongsTo(models.Folder, {
      foreignKey: 'folderId',
      as: 'folder'
    })
  }

  /**
   * Retreive the thumbnail filepath and generate it if it doesn't
   * already exist
   */
  async getThumbnail () {
    let thumbnail = `${process.env.BASE_DIR}/cache/thumbnails/${this.id}.png`

    let stat = fs.statSync(this.path)

    if (fs.existsSync(thumbnail) && stat.mtime.toString() === this.lastModified.toString()) {
      return thumbnail
    }

    let h = 350
    let w = Math.round(this.width * h / this.height)

    // Don't make a thumbnail if it's smaller than what we're going to make anyway
    if (this.height <= h) {
      return this.path
    }

    if (this.mimetype.match(/video\//)) {
      return new Promise((resolve, reject) => {
        ffmpeg(this.path)
          .on('end', () => {
            return resolve(thumbnail)
          })
          .screenshots({
            count: 1,
            timemarks: [0],
            filename: path.basename(thumbnail),
            folder: path.dirname(thumbnail),
            size: `${w}x${h}`
          })
      })
    }

    switch (this.mimetype) {
      // case 'image/gif':
      //   execFileSync(gifsicle, ['--scale', '0.5', '-o', thumbnail, this.path])
      //   break
      default:
        await sharp(this.path).resize({ width: w }).toFile(thumbnail)
        fs.utimesSync(thumbnail, new Date(this.lastModified), new Date(this.lastModified))
    }

    return thumbnail
  }

  toJSON () {
    return {
      ...this.get(),
      url: `/media/${this.id}`
    }
  }

  /**
   * Return the mimetype of the given file
   */
  static async getMIMEType (file) {
    return new Promise((resolve, reject) => {
      let detector = new Magic(mmmagic.MAGIC_MIME_TYPE)
      detector.detectFile(file, (err, result) => {
        if (err) {
          return reject(err)
        }

        return resolve(result)
      })
    })
  }
}

module.exports = Media
