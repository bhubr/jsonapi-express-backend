# JSONAPI Express.js / MySQL backend

**Fair bit of warning**: this is work in progress, and not production-ready (yet).

This project began as a standalone Express app, that I just started turning into an NPM module.

The motivation for it is to have a simple-to-use backend for [Ember.js](https://emberjs.com).

## Features

- MySQL support. Works with MariaDB (actually only tested on MariaDB). More (PostgreSQL) might come after.
- Dead-simple. No ORM.
- Uses JSON Web Tokens for authentication
- Supports one-to-one, one-to-many, many-to-many model relationships.

## Limitations

- As of now, you have to create your MySQL schema by hand. It has to respect some conventions as to table and field naming:
  - primary key for all tables is `id`
  - each data type (that is, all tables but the pivot tables) must have `createdAt` and `updatedAt` fields.
- To be completed...

## Install

    npm install --save jsonapi-express-backend

## TODO

- Don't query *all* the fields for relationships when I need only the id.
