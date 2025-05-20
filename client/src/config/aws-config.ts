import { Amplify } from 'aws-amplify';
import { ResourcesConfig } from 'aws-amplify';

const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_userPoolId',
      userPoolClientId: 'your-client-id',
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: 'your-domain.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: ['myapp://callback/'],
          redirectSignOut: ['myapp://'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      api: {
        endpoint: 'http://52.221.253.61:5000/api/v1',
        region: 'ap-southeast-1'
      }
    }
  }
};

export const configureAmplify = () => {
  Amplify.configure(awsConfig);
}; 