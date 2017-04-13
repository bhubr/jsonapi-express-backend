# JSONAPI Express.js / MySQL backend

## Live demo

A simple blog app: [https://ember-blog.info/](https://ember-blog.info/). **It still has many bugs** (like: no redirection after login) but should work. [Feedback](https://ember-blog.info/contact) is welcome.

Backend code for this demo app is [here](https://github.com/bhubr/jsonapi-express-backend-demo), frontend code is [here](https://github.com/bhubr/ember-blog).

## Fair bit of warning

This is work in progress, and not production-ready (yet). That being said, it does the job, for me at least :).

**Please** don't hesitate to [contact me](https://ember-blog.info/contact) if you run into issues while giving this project a try. As I am currently working on it heavily, I will definitely answer your request.
Besides, documentation is on its way, a user guide will be provided soon.

## About this project

This project began as a standalone Express app, that I just started turning into an [NPM module](https://www.npmjs.com/package/jsonapi-express-backend).

The motivation for it is to have a simple-to-use backend for [Ember.js](https://emberjs.com).

An example project is available at [https://github.com/bhubr/jsonapi-express-backend-demo](https://github.com/bhubr/jsonapi-express-backend-demo). It demonstrates how to configure the module by providing those parameters:
- public&private keys path
- db settings
- model relationships descriptors

## Install

    npm install --save jsonapi-express-backend

## Features

- MySQL support. Works with MariaDB (actually only tested on MariaDB). More (PostgreSQL) might come after.
- Dead-simple. No ORM, but simple query-building using [Squel](https://hiddentao.com/squel/).
- Uses JSON Web Tokens for authentication.
- Supports one-to-one, one-to-many, many-to-many model relationships.

## Limitations

- As of now, you have to create your MySQL schema by hand. It has to respect some conventions as to table and field naming:
  - primary key for all tables is `id`
  - each data type (that is, all tables but the pivot tables) must have `createdAt` and `updatedAt` fields.

## TODO

- Don't query *all* the fields for relationships when I need only the id.
- Implement an "event hub" and fire events on DB record creation/update/deletion.
- Allow filtering of the returned fields.
- Implement refresh of the JWT.