import * as eks from '@aws-cdk/aws-eks';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as merge from 'deepmerge';
import { EksAddon, EksAddonProps } from './EksAddon';
import { EksClusterPermissions } from './EksCluster';

/**
 * AddonStarboard general Configuration Options
*/
export interface AddonStarboardProps extends EksAddonProps {
  /**
   * The name of the starboard, used to generate
   * helm releasename: starboard-*name*
   * Therefore all resources are prefixed with the name
   * of the helm release
   */
  readonly name?: string;

  /**
   * namespaces to scan
   * comma separated string for multi namespace
   * @default all
   */
  readonly targetNamespaces?: string;
}

/**
 * EKS cluster addon that installs an starboard (with iam serviceaccount)
 *
 */
export class AddonStarboard extends EksAddon implements iam.IGrantable {

  readonly grantPrincipal: iam.IPrincipal;
  readonly role: iam.IRole;

  constructor( scope: cdk.Construct, props: AddonStarboardProps ) {

    super(scope, 'StarboardOperator', props);

    const releaseName = `starboard-${props.name ?? 'operator'}`;
    const targetNamespaces = props.targetNamespaces ?? '';

    const starboardServiceAccount = new eks.ServiceAccount(
      this,
      'GitlabRunnerServiceAccount',
      {
        cluster: this.namespace.cluster.clusterRef,
        namespace: this.namespace.name,
        name: `${releaseName}-cdk`,
      },
    );

    const labels = {
      release: releaseName,
      createdForGitlabRunnerName: releaseName,
      createdForGitlabRunnerNamespace: this.namespace.name,
      managedByCdk: 'true',
    };

    let role: eks.KubernetesManifest;
    let roleKind: string;
    let roleName: string;

    roleKind = 'ClusterRole';
    roleName = `${this.namespace.name}-${releaseName}-cdk`,
    role = new eks.KubernetesManifest(this, 'ClusterRole', {
      cluster: this.namespace.cluster.clusterRef,
      manifest: [{
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata: {
          name: roleName,
          labels: labels,
        },
        rules: EksClusterPermissions.starboardOperatorPermissions().rules,
      }],
    });

    let roleBinding = new eks.KubernetesManifest(this, 'ClusterRoleBinding', {
      cluster: this.namespace.cluster.clusterRef,
      manifest: [{
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRoleBinding',
        metadata: {
          name: `${this.namespace.name}-${releaseName}-cdk`,
          labels: labels,
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: roleKind,
          name: roleName,
        },
        subjects: [{
          kind: 'ServiceAccount',
          name: starboardServiceAccount.serviceAccountName,
          namespace: starboardServiceAccount.serviceAccountNamespace,
        }],
      }],
    });

    roleBinding.node.addDependency(role);
    roleBinding.node.addDependency(starboardServiceAccount);
    this.grantPrincipal = starboardServiceAccount.role;

    this.role = starboardServiceAccount.role;

    new eks.HelmChart(
      this,
      'HelmChart',
      {
        cluster: this.namespace.cluster.clusterRef,
        namespace: this.namespace.name,
        repository: 'https://aquasecurity.github.io/helm-charts/',
        chart: 'starboard-operator',
        release: releaseName,
        // renovate: repository=https://aquasecurity.github.io/helm-charts/ datasource=helm depName=starboard-operator versioning=semver
        version: '0.5.1',
        wait: this.wait,
        /**
         * starboard-operator possible values
         * @see https://github.com/aquasecurity/starboard/blob/main/deploy/helm/values.yaml
         */
        values: merge(
          {
            image: {
              repository: 'my-custom-registry.com/aquasec/starboard-operator',
              tag: '0.10.1',
            },
            rbac: {
              create: false,
            },
            serviceAccount: {
              create: false,
              annotations: {},
              name: starboardServiceAccount.serviceAccountName,
            },
            targetNamespaces: targetNamespaces,
            trivy: {
              imageRef: 'my-custom-registry.com/aquasec/trivy:0.16.0',
            },
            kubeBench: {
              imageRef: 'my-custom-registry.com/aquasec/kube-bench:0.5.0',
            },
            polaris: {
              imageRef: 'my-custom-registry.com/fairwinds/polaris:3.2',
            },
            conftest: {
              imageRef: 'my-custom-registry.com/openpolicyagent/conftest:v0.23.0',
            },
          },
          { ...props.valuesOverride },
        ),
      },
    );
  }
}
