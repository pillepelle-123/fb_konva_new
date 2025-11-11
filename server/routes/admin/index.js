const express = require('express')
const usersRouter = require('./users')
const booksRouter = require('./books')
const pagesRouter = require('./pages')

const router = express.Router()

router.use('/users', usersRouter)
router.use('/books', booksRouter)
router.use('/pages', pagesRouter)

module.exports = router

