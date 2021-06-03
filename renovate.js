module.exports = {
  extends: [
    "docker:enableMajor",
    ":semanticCommits",
    "group:monorepos",
    "group:recommended",
    ":preserveSemverRanges",
    ":rebaseStalePrs"
  ],
  platform: "gitlab",
  endpoint: "https://mygitlab.com/api/v4",
  token: `${process.env.GIT_USER_API_TOKEN}`,
  logLevel: `info`,
  labels: ["renovate", "seec-mop"],
  ignoreDeps: ["my-repo.com/renovate/renovate"],
  branchPrefix: "renovate/",
  assigneesFromCodeOwners: true,
  assigneesSampleSize: 5,
  lockFileMaintenance: {
    enabled: true
  },
  recreateClosed: true, //probably debug config
  requireConfig: false,
  onboarding: false,
  requiredStatusChecks: null,
  packageRules: [
    {
      matchUpdateTypes: ["major"],
      addLabels: ["major"]
    },
    {
      matchUpdateTypes: ["minor"],
      addLabels: ["minor"]
    },
    {
      matchUpdateTypes: ["patch"],
      addLabels: ["patch"]
    },
    {
      datasources: ["docker"],
      updateTypes: ["major", "minor", "patch"],
      enabled: true
    },
    {
      datasources: ["docker"],
      registryUrls: ["myrepo.com"]
    },
  ],
  pinDigests: false,
  postUpdateOptions: ['gomodTidy'],
  hostRules: [],
  // example from https://docs.renovatebot.com/modules/manager/regex/
  regexManagers: [{
      fileMatch: ["^Dockerfile$"],
      matchStrings: [
        "datasource=(?<datasource>.*?) depName=(?<depName>.*?)( versioning=(?<versioning>.*?))?\\sENV .*?_VERSION=(?<currentValue>.*)\\s"
      ],
      versioningTemplate: "{{#if versioning}}{{{versioning}}}{{else}}semver{{/if}}"
    },
    // {
    //   fileMatch: ["\\.ts$"],
    //   matchStringsStrategy: "combination",
    //   matchStrings: [
    //     "repository:\\s*\\'(?<registryUrl>.*)\\'\\s*",
    //     "chart:\\s*\\'(?<depName>.*)\\'\\s*",
    //     "version:\\s*\\'(?<currentValue>.*)\\'\\s*"
    //   ],
    //   versioningTemplate: "{{#if versioning}}{{{versioning}}}{{else}}semver{{/if}}",
    //   datasourceTemplate: "helm"
    // },
    {
      fileMatch: ["\\.ts$"],
      matchStrings: [
        "imageRef: \\'(?<depName>.*?):(?<currentValue>.*?)\\'"
      ],
      versioningTemplate: "{{#if versioning}}{{{versioning}}}{{else}}docker{{/if}}",
      datasourceTemplate: "docker"
    },
    {
      fileMatch: ["\\.ts$"],
      matchStrings: [
        "[iI]mage: \\{\\s.*?repository:\\s*\\'(?<depName>.*?)\\',\\s.*?tag: \\'(?<currentValue>.*?)\\'"
      ],
      versioningTemplate: "{{#if versioning}}{{{versioning}}}{{else}}docker{{/if}}",
      datasourceTemplate: "docker"
    },
    {
      fileMatch: ["^Dockerfile$"],
      matchStrings: [
        "ARG IMAGE=(?<depName>.*?):(?<currentValue>.*?)@(?<currentDigest>sha256:[a-f0-9]+)s"
      ],
      datasourceTemplate: "docker"
    }
  ]
};
