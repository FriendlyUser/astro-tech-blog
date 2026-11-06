---
title: Basic React Native Template
description: react native template for a basic app
pubDate: Saturday, 14 November 2022 13:00:00 GMT
tags: ["react-native", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---


### Summary


This is a basic react native template for a basic app. It is a good starting point for a new react native app. It has a basic navigation setup and a basic app theme setup. It also has a basic splash screen setup.


Login page is a good starting point for a new react native app. It has a basic navigation setup and a via `react-navigation/native-stack`, and comes with basic utilities for parsing passwords and emails.
```
import React, {useState} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  TextInput,
} from 'react-native';
import {emailValidator, passwordValidator} from '../helpers/utils';
import {LightTheme} from '../core/theme';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';

export type Props = NativeStackScreenProps<
  RootStackParamList,
  'Login',
  'MyStack'
>;

export default function LoginScreen({navigation}: Props) {
  const [email, setEmail] = useState({value: '', error: ''});
  const [password, setPassword] = useState({value: '', error: ''});

  const toRegisterPage = () => {
    navigation.navigate('Register');
  };
  const onLoginPressed = () => {
    const emailError = emailValidator(email.value);
    const passwordError = passwordValidator(password.value);
    if (emailError || passwordError) {
      setEmail({...email, error: emailError});
      setPassword({...password, error: passwordError});
      return;
    }
    navigation.navigate('Dashboard');
    // navigate to home screen on success
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.inputView}>
          <TextInput
            // label="Email"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => setEmail({value: text, error: ''})}
            // error={!!email.error}
            // errorText={email.error}
            autoCapitalize="none"
            // autoCompleteType="email"
            textContentType="emailAddress"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputView}>
          <TextInput
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setPassword({value: text, error: ''})}
            // error={!!password.error}
            // errorText={password.error}
            secureTextEntry
          />
        </View>

        <TouchableOpacity onPress={toRegisterPage}>
          <Text style={styles.forgot_button}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={onLoginPressed}>
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#3f3f3f",
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    marginBottom: 40,
  },

  inputView: {
    backgroundColor: LightTheme.colors.background,
    borderRadius: 30,
    width: '70%',
    height: 45,
    marginBottom: 20,
    alignItems: 'center',
  },

  TextInput: {
    height: 50,
    flex: 1,
    padding: 10,
    marginLeft: 20,
  },

  forgot_button: {
    height: 30,
    marginBottom: 30,
  },

  loginBtn: {
    width: '80%',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: LightTheme.colors.primary,
  },

  loginText: {
    color: 'white',
  },
});

```


For the password screen, there is some basic styling and 3 input fields (one for email)
and two more for register and register confirmation.

```
import React, {useState} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  TextInput,
} from 'react-native';
import {emailValidator, passwordValidator} from '../helpers/utils';
import {LightTheme} from '../core/theme';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';

export type Props = NativeStackScreenProps<
  RootStackParamList,
  'Register',
  'MyStack'
>;

export default function RegisterScreen({navigation}: Props) {
  const [email, setEmail] = useState({value: '', error: ''});
  const [password, setPassword] = useState({value: '', error: ''});
  const [confirmPassword, setConfirmPassword] = useState({
    value: '',
    error: '',
  });

  const onBackToLoginPressed = () => {
    navigation.navigate('Login');
  };
  const onButtonPressed = () => {
    const emailError = emailValidator(email.value);
    const passwordError = passwordValidator(password.value);
    if (emailError || passwordError) {
      setEmail({...email, error: emailError});
      setPassword({...password, error: passwordError});
      return;
    }
    if (confirmPassword !== password) {
      setConfirmPassword({...confirmPassword, error: 'Passwords do not match'});
      return;
    }
    // navigate to home screen on success
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.inputView}>
          <TextInput
            // label="Email"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => setEmail({value: text, error: ''})}
            // error={!!email.error}
            // errorText={email.error}
            autoCapitalize="none"
            // autoCompleteType="email"
            textContentType="emailAddress"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputView}>
          <TextInput
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setPassword({value: text, error: ''})}
            // error={!!password.error}
            // errorText={password.error}
            secureTextEntry
          />
        </View>
        <View style={styles.inputView}>
          <TextInput
            returnKeyType="done"
            value={password.value}
            onChangeText={text => setConfirmPassword({value: text, error: ''})}
            // error={!!password.error}
            // errorText={password.error}
            secureTextEntry
          />
        </View>

        <TouchableOpacity onPress={onBackToLoginPressed}>
          <Text style={styles.forgot_button}>Back to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={onButtonPressed}>
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
```

View the project at https://snack.expo.dev/@davidlsyomortgage.com/github.com-friendlyuser-react-native-navigation-template

note that the react native default components are removed.