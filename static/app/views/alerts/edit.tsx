import {Component, Fragment} from 'react';
import {RouteComponentProps} from 'react-router';
import styled from '@emotion/styled';

import * as Layout from 'sentry/components/layouts/thirds';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import SentryDocumentTitle from 'sentry/components/sentryDocumentTitle';
import {t} from 'sentry/locale';
import {Member, Organization, Project} from 'sentry/types';
import {trackAnalytics} from 'sentry/utils/analytics';
import Teams from 'sentry/utils/teams';
import withOrganization from 'sentry/utils/withOrganization';
import BuilderBreadCrumbs from 'sentry/views/alerts/builder/builderBreadCrumbs';
import IssueEditor from 'sentry/views/alerts/rules/issue';
import MetricRulesEdit from 'sentry/views/alerts/rules/metric/edit';
import {AlertRuleType} from 'sentry/views/alerts/types';

type RouteParams = {
  projectId: string;
  ruleId: string;
};

type Props = RouteComponentProps<RouteParams, {}> & {
  members: Member[] | undefined;
  organization: Organization;
  project: Project;
};

type State = {
  ruleName: string;
};

class ProjectAlertsEditor extends Component<Props, State> {
  state: State = {
    ruleName: '',
  };

  componentDidMount() {
    const {organization, project} = this.props;
    trackAnalytics('edit_alert_rule.viewed', {
      organization,
      project_id: project.id,
      alert_type: this.getAlertType(),
    });
  }

  handleChangeTitle = (ruleName: string) => {
    this.setState({ruleName});
  };

  getTitle() {
    const {ruleName} = this.state;
    return `${ruleName}`;
  }

  getAlertType(): AlertRuleType {
    return location.pathname.includes('/alerts/metric-rules/')
      ? AlertRuleType.METRIC
      : AlertRuleType.ISSUE;
  }

  render() {
    const {organization, project, members} = this.props;
    const hasMetricAlerts = organization.features.includes('incidents');
    const alertType = this.getAlertType();

    return (
      <Fragment>
        <SentryDocumentTitle
          title={this.getTitle()}
          orgSlug={organization.slug}
          projectSlug={project.slug}
        />
        <Layout.Header>
          <Layout.HeaderContent>
            <BuilderBreadCrumbs
              organization={organization}
              title={t('Edit Alert Rule')}
              projectSlug={project.slug}
            />
            <Layout.Title>{this.getTitle()}</Layout.Title>
          </Layout.HeaderContent>
        </Layout.Header>
        <EditConditionsBody>
          <Teams provideUserTeams>
            {({teams, initiallyLoaded}) =>
              initiallyLoaded ? (
                <Fragment>
                  {(!hasMetricAlerts || alertType === AlertRuleType.ISSUE) && (
                    <IssueEditor
                      {...this.props}
                      project={project}
                      onChangeTitle={this.handleChangeTitle}
                      userTeamIds={teams.map(({id}) => id)}
                      members={members}
                    />
                  )}
                  {hasMetricAlerts && alertType === AlertRuleType.METRIC && (
                    <MetricRulesEdit
                      {...this.props}
                      project={project}
                      onChangeTitle={this.handleChangeTitle}
                      userTeamIds={teams.map(({id}) => id)}
                    />
                  )}
                </Fragment>
              ) : (
                <LoadingIndicator />
              )
            }
          </Teams>
        </EditConditionsBody>
      </Fragment>
    );
  }
}

const EditConditionsBody = styled(Layout.Body)`
  *:not(img) {
    max-width: 1000px;
  }
`;

export default withOrganization(ProjectAlertsEditor);
