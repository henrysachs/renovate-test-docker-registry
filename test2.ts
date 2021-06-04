const kubePrometheusStackHelmChart = new eks.HelmChart(
  this,
  'HelmChart',
  {
    cluster: this.namespace.cluster.clusterRef,
    namespace: this.namespace.name,
    repository: 'https://prometheus-community.github.io/helm-charts',
    chart: 'kube-prometheus-stack',
    release: 'kube-prometheus-stack',
    wait: this.wait,
    /**
     * gitlab-runner possible values
     * @see https://gitlab.com/gitlab-org/charts/gitlab-runner/-/blob/master/values.yaml
     */
    values: merge(
      { ...props.valuesOverride },
      {
        'defaultRules': {
          /**
           * Disable the default rules of the kube prometheus stack, because finally
           * we decided to create our own monitoring helm chart.
           */
          create: false,
        },
        'kubeControllerManager': {
          enabled: false,
        },
        'kube-state-metrics': {
          image: {
            repository:
              'k8s-gcr-docker-remote.funhub.tech.dz.pb.de/kube-state-metrics/kube-state-metrics',
          },
        },
        'kubeScheduler': {
          enabled: false,
        },
        'prometheusOperator': {
          image: {
            repository: 'quay-docker-remote.funhub.tech.dz.pb.de/prometheus-operator/prometheus-operator',
            tag: 'v0.46.0',
          },
          prometheusConfigReloaderImage: {
            repository: 'quay-docker-remote.funhub.tech.dz.pb.de/prometheus-operator/prometheus-config-reloader',
            tag: 'v0.46.0',
          },
        },
        'grafana': {
          'ingress': {
            enabled: true,
            annotations: {
              'kubernetes.io/ingress.class': 'nginx',
            },
            hosts: [
              `grafana.cluster-${this.namespace.cluster.name}${props.zoneSuffix}`,
            ],
          },
          'ldap': {
            enabled: true,
            // TODO: secret handling for ldap password
            config: dedent(`
              verbose_logging = true
              [[servers]]
              host = "${ldapHost}"
              port = 636
              use_ssl = true
              start_tls = false
              ssl_skip_verify = true
              bind_dn = "${props.grafana.ldap.username}"
              bind_password = '${props.grafana.ldap.password}'
              search_filter = "(sAMAccountName=%s)"
              search_base_dns = ["DC=bku,DC=db,DC=de"]
              [servers.attributes]
              name = "givenName"
              surname = "sn"
              username = "sAMAccountName" #instead of cn
              member_of = "memberOf"
              email =  "email"
              [[servers.group_mappings]]
              group_dn = "${props.grafana.ldap.adminGroupDn}"
              org_role = "Admin"
              grafana_admin = true # Available in Grafana v5.3 and above
              ${groupMappings}`),
          },
          'envRenderSecret': {
            GF_DATABASE_TYPE: 'postgres',
            GF_DATABASE_HOST: `${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}`,
            GF_DATABASE_USER: 'aws_admin',
            GF_DATABASE_PASSWORD: props.databasePassword,
            GF_DATABASE_NAME: databaseName,
            GF_REMOTE_CACHE_TYPE: 'database',
          },
          'grafana.ini': {
            'auth.ldap': {
              enabled: true,
              allow_sign_up: true,
              config_file: '/etc/grafana/ldap.toml',
            },
          },
        },
        'prometheus': {
          prometheusSpec: {
            retention: props.prometheus.retention,
            retentionSize: prometheusRetentionSize,
            replicas: prometheusReplicas,
            podAntiAffinity: 'hard',
            podAntiAffinityTopologyKey: 'topology.kubernetes.io/zone',
            ruleSelectorNilUsesHelmValues: false,
            serviceMonitorSelectorNilUsesHelmValues: false,
            storageSpec: {
              volumeClaimTemplate: {
                spec: {
                  storageClassName: prometheusStorageClassName,
                  accessModes: ['ReadWriteOnce'],
                  resources: {
                    requests: {
                      storage: props.prometheus.storage.storageSize,
                    },
                  },
                },
              },
            },
          },
        },
    const kubePrometheusStackCustomRulesHelmChart = new eks.HelmChart(
      this,
      'RulesHelmChart',
      {
        cluster: this.namespace.cluster.clusterRef,
        namespace: this.namespace.name,
        repository: 'https://custom-repo.com/artifactory/1-helm-prod-virtual',
        chart: 'kube-prometheus-stack-custom-rules',
        release: 'kube-prometheus-stack-custom-rules',
        version: '0.3.0',
  }
}
