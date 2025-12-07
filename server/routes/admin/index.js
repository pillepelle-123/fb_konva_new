const express = require('express')
const usersRouter = require('./users')
const booksRouter = require('./books')
const pagesRouter = require('./pages')
const backgroundImagesRouter = require('./background-images')
const stickersRouter = require('./stickers')

const router = express.Router()

router.use('/users', usersRouter)
router.use('/books', booksRouter)
router.use('/pages', pagesRouter)
router.use('/background-images', backgroundImagesRouter)
router.use('/stickers', stickersRouter)

module.exports = router

