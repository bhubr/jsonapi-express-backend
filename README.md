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

- pgsql support
- localization
- proper error format in JSONAPI responses
- enforce that *required* relationships are provided on resource creation
  (unless we decide to allow empty relationship: http://stackoverflow.com/questions/15082874/how-to-pass-a-null-value-to-a-foreign-key-field)
- provide an admin backend single-page app, ala Django Admin
- pagination
- Don't query *all* the fields for relationships when I need only the id.
- Implement an "event hub" and fire events on DB record creation/update/deletion.
- Allow filtering of the returned fields.
- Export queryBuilder, queryAsync, utils, etc. from index.js
- ~~Implement refresh of the JWT~~ (done).
- Unique email and username in users table
- Prevent from removing email and password from user's required attrs
- Allow only admins to override roleId on user
- Pre checks on app start: existing roles and permissions, etc.
- ~~Move default user role set on beforeSave ? NO, just after!~~
- Remove role relationship from payload unless user has permission to modify/create user
- on update, what does JSONAPI spec say? can we update just a subset of the attrs?
- in future event emitter: on update, fire an event with just the modified fields (so that we can perform custom actions if this or that field is changed)
- "nonces", regenerated on each POST/PUT/PATCH request, and passed down to client which must send it in next request... complicated, furthermore requests can be forged with that too.
- permissions: e.g. allow a user to remove any comment on a post of his/her. comment belong to another user, but is linked to a post belonging to the user. Also, a comment might be anonymous (hence no user id associated). Other example: a user can't DELETE a tag that is linked to a post of his, but might be linked to other users' posts as well...
- Fix inconsistencies (i.e. setting type/table on req.body / req.body.data) ==> ** CRITICAL **
- func checkPermission uses table and should be using type instead (and better, *singular* for type)
- a user should not be able to delete itself... Or should he???
- attention! I override req.body.data.type somewhere...
- check that the payload attributes have proper format (check against model relationships descriptor, then inside check for data, and inside for type and id, then inside for existing entry)
- Permissions on *create*: check that provided user id in relationships payload matches the JWT's user id.
- More issues on [project issue tracker](https://github.com/bhubr/jsonapi-express-backend/issues)