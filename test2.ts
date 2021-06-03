
    /**
     * Install the kube prometheus stack helm chart
     */
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
                  'custom-gcr-mirror/kube-state-metrics/kube-state-metrics',
              },
            },
            'kubeScheduler': {
              enabled: false,
            },
            'prometheusOperator': {
              image: {
                repository: 'custom-quay-mirror.com/prometheus-operator/prometheus-operator',
                tag: 'v0.46.0',
              },
              prometheusConfigReloaderImage: {
                repository: 'custom-quay-mirror.com/prometheus-operator/prometheus-config-reloader',
                tag: 'v0.46.0',
              },
            },
      },
    );
    kubePrometheusStackHelmChart.node.addDependency(database);

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
