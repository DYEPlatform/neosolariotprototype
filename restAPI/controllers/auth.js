import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import bcrypt from 'bcrypt'
import isEmpty from 'lodash/isEmpty';

import User from '../models/user';
import Device from '../models/device';
import { socialAuth, validateByGoole } from '../config/socialAuth'
import { MONGO } from '../config/config';
import { validateUser, validateGoogle } from '../validate/user'
import { validateDevice } from '../validate/device'

class AuthController {

  signin(req, res) {

    let validate = validateUser(req.body, false)
    if (validate.isValid) {
      User.findOne({ email: req.body.email })
      .then((user) => {
        if(user){
          user.comparePassword(req.body.password, (err, isMatch) => {
            if (isMatch && !err) {
              var token = jwt.sign(user, MONGO.secret, {
                expiresIn: 10000 //segundos
              });
              return res.status(200).json({ status: 'OK', token: 'JWT '+ token, user: user});
            }
            else {
              return res.status(400).json({ status: 'Error', errors: { password: 'Password Incorrecta' } });
            }
          })
        }
        else{
          return res.status(404).json({ status: 'Error', errors: { user: 'Usuario No Encontrado' } });
        }
      })
      .catch((err) => {
        return res.status(500).json({ status: 'Error', errors: { server: 'Problemas con el servidor' } })
      })
    }
    else {
      return res.status(400).json({ status: 'Error', errors: validate.errors });
    }

  }

  signup(req, res){

    validateUser(req.body, true)
      .then(({errors, isValid}) => {
        if(isValid) {
          User.create({
            email: req.body.email,
            password: req.body.password})
            .then((user) => {
              const token = jwt.sign(user, MONGO.secret, {
                expiresIn: 10000,
              });
              return res.status(201).json({ status: 'OK', user: user, token: 'JWT '+token });
            })
            .catch((err) => {
              return res.status(500).json({ status: 'Error', errors: { server: 'Problemas con el servidor' } })
            })
        }
        else {
          res.status(400).json({ status: 'Error', errors: errors });
        }
      })

  }

  existEmail(req, res){

    if(!req.params.email){
     return res.status(400).json({status: 'Error', errors: {email: 'Campo Requerido'}});
    }

    if(!validator.isEmail(req.params.email)){
     return res.status(400).json({status: 'Error', errors: {email: 'El Campo debe ser un email'}});
    }

    User.findOne({ 'email' : req.params.email })
     .then( user => {
       if(user){
         return res.status(200).json({errors: {email: 'Este Correo ya está siendo utilizado'}, status: 'Error'});
       }
       return res.status(200).json({status: 'OK'});
    })

  }

  google(req, res){

    const token = jwt.sign(req.user, MONGO.secret, {
      expiresIn: 10000 //segundos
    });

    const data = {
      token: "JWT "+token,
      user: req.user,
    }
    res.status(200).json(data);

  }


  googleNative(req, res){

    validateGoogle(req.body)
      .then(({errors, isValid, userid}) => {
        if(isValid){
          User.findOne({ 'google.id' : userid.id })
            .then( user => {
              if(user){
                const token = jwt.sign(user, MONGO.secret, {
                      expiresIn: 10000 //segundos
                });
                return res.status(200).json({user: user, token: `JWT ${token}`});
              }
              else{
                User.create({
                  email: res.body.email,
                  google: userid,
                  password: id })
                  .then( userCreate => {
                    const token = jwt.sign(user, MONGO.secret, {
                          expiresIn: 10000 //segundos
                    });
                    return res.status(201).json({user: user, token: `JWT ${token}`});
                  })
                  .catch( err => {
                    return res.status(400).json({
                      errors: {email: 'Este Email ya está siendo utilizado'}
                      , status: 'Error'})
                  })
              }
            })
        }
        else{
          return res.status(400).json({errors: errors, status: 'Error'})
        }
      })

  }

  deviceSignin(req, res) {

    let validate = validateDevice(req.body)
    if(validate.isValid){
      Device.findOne({_id: req.body.id})
        .then((device) => {
          if(device){
            bcrypt.compare(req.body.password, device.password)
            .then((validatePassword) => {
              if(validatePassword == false){
                return res.status(400).json({ status: 'Error', errors: { password: 'Password Incorrecta' } });
              }
              else{
                let token = jwt.sign(device, MONGO.secret, {
                  expiresIn: 10000 //segundos
                });
                return res.status(200).json({ status: 'OK', token: 'JWT '+ token, device: device});
              }
            })
          }
          else{
            return res.status(404).json({ status: 'Error', errors: { device: 'Device No Encontrado' } });
          }
        })
        .catch((err) => {
          return res.status(500).json({ status: 'Error', errors: { server: 'Problemas con el servidor' } })
        })
    }
    else {
      return res.status(400).json({ status: 'Error', errors: validate.errors });
    }

  }

}

export default AuthController;
