import React, {FC, ReactElement, useState} from 'react';
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Parse from 'parse/react-native';
import {useNavigation} from '@react-navigation/native';
import {GoogleSignin} from '@react-native-community/google-signin';
import {
  AccessToken,
  GraphRequest,
  GraphRequestManager,
  LoginManager,
} from 'react-native-fbsdk';
import Styles from './Styles';

export const UserLogIn: FC<{}> = ({}): ReactElement => {
  const navigation = useNavigation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const doUserLogIn = async function (): Promise<boolean> {
    // Note that this values come from state variables that we've declared before
    const usernameValue: string = username;
    const passwordValue: string = password;
    return await Parse.User.logIn(usernameValue, passwordValue)
      .then(async (loggedInUser: Parse.User) => {
        // logIn will throw an error if the user is not verified yet,
        // but it's safer to check again after login
        if (loggedInUser.get('emailVerified') === true) {
          Alert.alert(
            'Success!',
            `User ${loggedInUser.get('username')} has successfully signed in!`,
          );
          // Verify this is in fact the current user
          const currentUser: Parse.User = await Parse.User.currentAsync();
          console.log(loggedInUser === currentUser);
          // Navigation.navigate takes the user to the home screen
          navigation.navigate('Home');
          return true;
        } else {
          await Parse.User.logOut();
          return false;
        }
      })
      .catch((error: object) => {
        // Error can be caused by wrong parameters or lack of Internet connection.
        // A non-verified user will also cause an error
        Alert.alert('Error!', error.message);
        return false;
      });
  };

  const doUserLogInGoogle = async function (): Promise<boolean> {
    try {
      // Check if your user can sign in using Google on his phone
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      // Retrieve user data from Google
      const userInfo: object = await GoogleSignin.signIn();
      const googleIdToken: string = userInfo.idToken;
      const googleUserId: string = userInfo.user.id;
      const googleEmail: string = userInfo.user.email;
      const authData: object = {
        id: googleUserId,
        id_token: googleIdToken,
      };
      // Log in or sign up on Parse using this Google credentials
      let userToLogin: Parse.User = new Parse.User();
      // Set username and email to match google email
      userToLogin.set('username', googleEmail);
      userToLogin.set('email', googleEmail);
      return await userToLogin
        .linkWith('google', {
          authData: authData,
        })
        .then(async (loggedInUser: Parse.User) => {
          // logIn returns the corresponding ParseUser object
          Alert.alert(
            'Success!',
            `User ${loggedInUser.get('username')} has successfully signed in!`,
          );
          // To verify that this is in fact the current user, currentAsync can be used
          const currentUser: Parse.User = await Parse.User.currentAsync();
          console.log(loggedInUser === currentUser);
          // Navigation.navigate takes the user to the screen named after the one
          // passed as parameter
          navigation.navigate('Home');
          return true;
        })
        .catch(async (error: object) => {
          // Error can be caused by wrong parameters or lack of Internet connection
          Alert.alert('Error!', error.message);
          return false;
        });
    } catch (error) {
      Alert.alert('Error!', error.code);
      return false;
    }
  };

  const doUserLogInFacebook = async function (): Promise<boolean> {
    try {
      // Login using the Facebook login dialog asking form email permission
      return await LoginManager.logInWithPermissions(['email']).then(
        (loginResult: object) => {
          if (loginResult.isCancelled) {
            console.log('Login cancelled');
            return false;
          } else {
            // Retrieve access token from FBSDK to be able to linkWith Parse
            AccessToken.getCurrentAccessToken().then((data: object) => {
              const facebookAccessToken = data.accessToken;
              // Callback that will be called after FBSDK successfuly retrieves user email and id from FB
              const responseEmailCallback = async (
                error: string,
                emailResult: object,
              ) => {
                if (error) {
                  console.log('Error fetching data: ' + error.toString());
                } else {
                  // Format authData to provide correctly for Facebook linkWith on Parse
                  const facebookId: string = emailResult.id;
                  const facebookEmail: string = emailResult.email;
                  const authData: object = {
                    id: facebookId,
                    access_token: facebookAccessToken,
                  };
                  // Log in or sign up on Parse using this Facebook credentials
                  let userToLogin: Parse.User = new Parse.User();
                  // Set username and email to match provider email
                  userToLogin.set('username', facebookEmail);
                  userToLogin.set('email', facebookEmail);
                  return await userToLogin
                    .linkWith('facebook', {
                      authData: authData,
                    })
                    .then(async (loggedInUser: Parse.User) => {
                      // logIn returns the corresponding ParseUser object
                      Alert.alert(
                        'Success!',
                        `User ${loggedInUser.get(
                          'username',
                        )} has successfully signed in!`,
                      );
                      // To verify that this is in fact the current user, currentAsync can be used
                      const currentUser: Parse.User = await Parse.User.currentAsync();
                      console.log(loggedInUser === currentUser);
                      // Navigation.navigate takes the user to the screen named after the one
                      // passed as parameter
                      navigation.navigate('Home');
                      return true;
                    })
                    .catch(async (error: object) => {
                      // Error can be caused by wrong parameters or lack of Internet connection
                      Alert.alert('Error!', error.message);
                      return false;
                    });
                }
              };

              // Formats a FBSDK GraphRequest to retrieve user email
              const emailRequest = new GraphRequest(
                '/me',
                {
                  accessToken: facebookAccessToken,
                  parameters: {
                    fields: {
                      string: 'email',
                    },
                  },
                },
                responseEmailCallback,
              );

              // Start the graph request, which will call the callback after finished
              new GraphRequestManager().addRequest(emailRequest).start();

              return true;
            });
          }
        },
        (error: string) => {
          console.log('Login fail with error: ' + error);
          return false;
        },
      );
    } catch (error: object) {
      Alert.alert('Error!', error.code);
      return false;
    }
  };

  return (
    <View style={Styles.login_wrapper}>
      <View style={Styles.form}>
        <TextInput
          style={Styles.form_input}
          value={username}
          placeholder={'Username'}
          onChangeText={(text) => setUsername(text)}
          autoCapitalize={'none'}
          keyboardType={'email-address'}
        />
        <TextInput
          style={Styles.form_input}
          value={password}
          placeholder={'Password'}
          secureTextEntry
          onChangeText={(text) => setPassword(text)}
        />
        <TouchableOpacity onPress={() => doUserLogIn()}>
          <View style={Styles.button}>
            <Text style={Styles.button_label}>{'Sign in'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={Styles.login_social}>
        <View style={Styles.login_social_separator}>
          <View style={Styles.login_social_separator_line} />
          <Text style={Styles.login_social_separator_text}>{'or'}</Text>
          <View style={Styles.login_social_separator_line} />
        </View>
        <View style={Styles.login_social_buttons}>
          <TouchableOpacity onPress={() => doUserLogInFacebook()}>
            <View
              style={[
                Styles.login_social_button,
                Styles.login_social_facebook,
              ]}>
              <Image
                style={Styles.login_social_icon}
                source={require('./assets/icon-facebook.png')}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => doUserLogInGoogle()}>
            <View style={Styles.login_social_button}>
              <Image
                style={Styles.login_social_icon}
                source={require('./assets/icon-google.png')}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity>
            <View style={Styles.login_social_button}>
              <Image
                style={Styles.login_social_icon}
                source={require('./assets/icon-apple.png')}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <>
        <TouchableOpacity onPress={() => navigation.navigate('Sign Up')}>
          <Text style={Styles.login_footer_text}>
            {"Don't have an account? "}
            <Text style={Styles.login_footer_link}>{'Sign up'}</Text>
          </Text>
        </TouchableOpacity>
      </>
    </View>
  );
};
