#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack, MainStackProps } from '../lib/cdk-stack';
import { AwsSolutionsChecks } from 'cdk-nag';
import { UsEast1Stack } from '../lib/us-east-1-stack';

const app = new cdk.App();

const targetEnv = process.env.TARGET_ENV ?? 'Sandbox';

const virginia = new UsEast1Stack(app, `RemoteSweUsEast1Stack-${targetEnv}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  crossRegionReferences: true,
});

// Parse additional AWS managed policies from environment variable if provided
const additionalAwsManagedPolicies = process.env.WORKER_ADDITIONAL_POLICIES
  ? process.env.WORKER_ADDITIONAL_POLICIES.split(',')
      .map((p) => p.trim())
      .filter((p) => p)
  : undefined;

const props: MainStackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true,
  signPayloadHandler: virginia.signPayloadHandler,
  workerAmiIdParameterName: '/remote-swe/worker/ami-id',
  slack: {
    botTokenParameterName: '/remote-swe/slack/bot-token',
    signingSecretParameterName: '/remote-swe/slack/signing-secret',
    adminUserIdList: process.env.ADMIN_USER_ID_LIST,
  },
  github: {
    ...(process.env.GITHUB_APP_ID
      ? {
          privateKeyParameterName: '/remote-swe/github/app-private-key',
          appId: process.env.GITHUB_APP_ID!,
          installationId: process.env.GITHUB_INSTALLATION_ID!,
        }
      : {
          personalAccessTokenParameterName: '/remote-swe/github/personal-access-token',
        }),
  },
  ...(process.env.AWS_ACCOUNT_ID_LIST_FOR_LB
    ? {
        loadBalancing: {
          awsAccounts: process.env.AWS_ACCOUNT_ID_LIST_FOR_LB.split(','),
          roleName: process.env.ROLE_NAME_FOR_LB ?? 'bedrock-remote-swe-role',
        },
      }
    : {}),
  ...(additionalAwsManagedPolicies ? { additionalAwsManagedPolicies } : {}),
  initialWebappUserEmail: process.env.INITIAL_WEBAPP_USER_EMAIL,
};

new MainStack(app, `RemoteSweStack-${targetEnv}`, {
  ...props,
});
// cdk.Aspects.of(app).add(new AwsSolutionsChecks());
