from unittest.mock import Mock, patch

from sentry.rules.filters.issue_category import IssueCategoryFilter
from sentry.rules.registry import RuleRegistry
from sentry.testutils.cases import APITestCase
from sentry.testutils.silo import region_silo_test

EMAIL_ACTION = "sentry.mail.actions.NotifyEmailAction"
APP_ACTION = "sentry.rules.actions.notify_event_service.NotifyEventServiceAction"
JIRA_ACTION = "sentry.integrations.jira.notify_action.JiraCreateTicketAction"
JIRA_SERVER_ACTION = "sentry.integrations.jira_server.notify_action.JiraServerCreateTicketAction"
AZURE_DEV_OPS_ACTION = "sentry.integrations.vsts.notify_action.AzureDevopsCreateTicketAction"
SENTRY_APP_ALERT_ACTION = "sentry.rules.actions.notify_event_sentry_app.NotifyEventSentryAppAction"


@region_silo_test(stable=True)
class ProjectRuleConfigurationTest(APITestCase):
    endpoint = "sentry-api-0-project-rules-configuration"

    def setUp(self):
        super().setUp()
        self.login_as(user=self.user)
        self.ticket_actions = [JIRA_ACTION, AZURE_DEV_OPS_ACTION]

    def test_simple(self):
        team = self.create_team()
        project1 = self.create_project(teams=[team], name="foo")
        self.create_project(teams=[team], name="baz")

        response = self.get_success_response(self.organization.slug, project1.slug)
        assert len(response.data["actions"]) == 10
        assert len(response.data["conditions"]) == 7
        assert len(response.data["filters"]) == 8

    @property
    def rules(self):
        rules = RuleRegistry()
        rule = Mock()
        rule.id = EMAIL_ACTION
        rule.rule_type = "action/lol"
        node = rule.return_value
        node.id = EMAIL_ACTION
        node.label = "hello"
        node.prompt = "hello"
        node.is_enabled.return_value = True
        node.form_fields = {}
        rules.add(rule)
        return rules

    def run_mock_rules_test(self, expected_actions, querystring_params, rules=None):
        if not rules:
            rules = self.rules
        with patch("sentry.api.endpoints.project_rules_configuration.rules", rules):
            response = self.get_success_response(
                self.organization.slug, self.project.slug, qs_params=querystring_params
            )

            assert len(response.data["actions"]) == expected_actions
            assert len(response.data["conditions"]) == 0

    def test_filter_show_notify_email_action(self):
        self.run_mock_rules_test(1, {})

    def test_show_notify_event_service_action(self):
        rules = RuleRegistry()
        rule = Mock()
        rule.id = APP_ACTION
        rule.rule_type = "action/lol"
        node = rule.return_value
        node.id = rule.id
        node.label = "hello"
        node.prompt = "hello"
        node.is_enabled.return_value = True
        node.form_fields = {}
        node.get_services.return_value = [Mock()]
        rules.add(rule)
        self.run_mock_rules_test(1, {}, rules=rules)

    def test_hide_empty_notify_event_service_action(self):
        rules = RuleRegistry()
        rule = Mock()
        rule.id = APP_ACTION
        rule.rule_type = "action/lol"
        node = rule.return_value
        node.id = rule.id
        node.label = "hello"
        node.prompt = "hello"
        node.is_enabled.return_value = True
        node.form_fields = {}
        node.get_services.return_value = []
        rules.add(rule)
        self.run_mock_rules_test(0, {}, rules=rules)

    def test_available_actions(self):
        response = self.get_success_response(self.organization.slug, self.project.slug)

        action_ids = [action["id"] for action in response.data["actions"]]
        assert EMAIL_ACTION in action_ids
        for action in self.ticket_actions:
            assert action in action_ids

    def test_ticket_rules_not_in_available_actions(self):
        with self.feature({"organizations:integrations-ticket-rules": False}):
            response = self.get_success_response(
                self.organization.slug, self.project.slug, includeAllTickets=True
            )

            action_ids = [action["id"] for action in response.data["actions"]]
            assert EMAIL_ACTION in action_ids
            for action in self.ticket_actions:
                assert action not in action_ids
            assert "disabledTicketActions" not in response.data

    @patch("sentry.api.endpoints.project_rules_configuration.rules", new=[])
    def test_show_disabled_ticket_actions(self):
        response = self.get_success_response(
            self.organization.slug, self.project.slug, includeAllTickets=True
        )
        disabled_ticket_actions = response.data["disabledTicketActions"]
        assert len(disabled_ticket_actions) == 3
        for ticket in self.ticket_actions:
            assert ticket in disabled_ticket_actions

    def test_sentry_app_alertable_webhook(self):
        team = self.create_team()
        project1 = self.create_project(teams=[team], name="foo")
        self.create_project(teams=[team], name="baz")

        sentry_app = self.create_sentry_app(
            organization=self.organization,
            is_alertable=True,
        )
        self.create_sentry_app_installation(
            slug=sentry_app.slug, organization=self.organization, user=self.user
        )

        response = self.get_success_response(self.organization.slug, project1.slug)

        assert len(response.data["actions"]) == 11
        assert {
            "id": "sentry.rules.actions.notify_event_service.NotifyEventServiceAction",
            "label": "Send a notification via {service}",
            "enabled": True,
            "prompt": "Send a notification via an integration",
            "formFields": {
                "service": {"type": "choice", "choices": [[sentry_app.slug, sentry_app.name]]}
            },
        } in response.data["actions"]
        assert len(response.data["conditions"]) == 7
        assert len(response.data["filters"]) == 8

    @patch("sentry.sentry_apps.SentryAppComponentPreparer.run")
    def test_sentry_app_alert_rules(self, mock_sentry_app_components_preparer):
        team = self.create_team()
        project1 = self.create_project(teams=[team], name="foo")
        self.create_project(teams=[team], name="baz")
        settings_schema = self.create_alert_rule_action_schema()

        sentry_app = self.create_sentry_app(
            organization=self.organization,
            schema={"elements": [settings_schema]},
            is_alertable=True,
        )
        install = self.create_sentry_app_installation(
            slug=sentry_app.slug, organization=self.organization, user=self.user
        )
        response = self.get_success_response(self.organization.slug, project1.slug)

        assert len(response.data["actions"]) == 11
        assert {
            "id": SENTRY_APP_ALERT_ACTION,
            "service": sentry_app.slug,
            "actionType": "sentryapp",
            "prompt": sentry_app.name,
            "enabled": True,
            "label": "Create Task with App with these ",
            "formFields": settings_schema["settings"],
            "sentryAppInstallationUuid": str(install.uuid),
        } in response.data["actions"]
        assert len(response.data["conditions"]) == 7
        assert len(response.data["filters"]) == 8

    def test_issue_type_and_category_filter_feature(self):
        response = self.get_success_response(self.organization.slug, self.project.slug)
        assert len(response.data["actions"]) == 10
        assert len(response.data["conditions"]) == 7
        assert len(response.data["filters"]) == 8

        filter_ids = {f["id"] for f in response.data["filters"]}
        assert IssueCategoryFilter.id in filter_ids

    def test_issue_severity_filter_feature(self):
        # Hide the issue severity filter when issue-severity-alerts is off
        with self.feature({"projects:first-event-severity-alerting": False}):
            response = self.get_success_response(self.organization.slug, self.project.slug)
            assert "sentry.rules.filters.issue_severity.IssueSeverityFilter" not in [
                filter["id"] for filter in response.data["filters"]
            ]

        # Show the issue severity filter when issue-severity-alerts is on
        with self.feature({"projects:first-event-severity-alerting": True}):
            response = self.get_success_response(self.organization.slug, self.project.slug)
            assert "sentry.rules.filters.issue_severity.IssueSeverityFilter" in [
                filter["id"] for filter in response.data["filters"]
            ]
