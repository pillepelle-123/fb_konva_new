const express = require('express')
const usersRouter = require('./users')
const booksRouter = require('./books')
const pagesRouter = require('./pages')
const backgroundImagesRouter = require('./background-images')
const stickersRouter = require('./stickers')
const themesRouter = require('./themes')
const colorPalettesRouter = require('./color-palettes')
const layoutTemplatesRouter = require('./layout-templates')

const router = express.Router()

router.use('/users', usersRouter)
router.use('/books', booksRouter)
router.use('/pages', pagesRouter)
router.use('/background-images', backgroundImagesRouter)
router.use('/stickers', stickersRouter)
router.use('/themes', themesRouter)
router.use('/color-palettes', colorPalettesRouter)
router.use('/layout-templates', layoutTemplatesRouter)

module.exports = router

