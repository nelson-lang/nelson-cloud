# ☁️nelson-cloud

[![Build Status](https://travis-ci.org/Nelson-numerical-software/nelson-cloud.svg?branch=master)](https://travis-ci.org/Nelson-numerical-software/nelson-cloud)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![GitHub license](https://img.shields.io/badge/license-GPL2-blue.svg)](https://github.com/Nelson-numerical-software/nelson-cloud/blob/master/COPYING.md)
[![CLA assistant](https://cla-assistant.io/readme/badge/Nelson-numerical-software/nelson-cloud)](https://cla-assistant.io/Nelson-numerical-software/nelson-cloud)
[![npm version](https://badge.fury.io/js/nelson-cloud.svg)](https://badge.fury.io/js/nelson-cloud)
[![Known Vulnerabilities](https://snyk.io/test/github/Nelson-numerical-software/nelson-cloud/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Nelson-numerical-software/nelson-cloud?targetFile=package.json)

nelson on the cloud

## Introduction

Nelson available as an online service.

[![See video demo here](http://img.youtube.com/vi/0FTcWsZx_04/0.jpg)](https://www.youtube.com/watch?v=0FTcWsZx_04)

Deploy easily your own server and custom it.

## Installation

Nelson-cloud can be installed as global or locally as npm package

As prerequirements, you need to install docker and run command:

```bash
docker pull nelsonsoftware/nelson-sio-cli:latest
```

```bash
npm install -g nelson-cloud
```

```bash
nelson-cloud
```

open your web brower and open url:

```bash
http://localhost:9090
```

## Development

clone current repository

```bash
npm run dockerInstall
```

```bash
npm install
```

Start application in a console:

```bash
npm start
```

Run tests in another console:

```bash
npm test
```

Allan CORNET (nelson.numerical.computation@gmail.com)
