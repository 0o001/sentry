from typing import List

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from typing_extensions import TypedDict

from sentry import ratelimits as ratelimiter
from sentry.api.base import region_silo_endpoint
from sentry.api.bases.organization import OrganizationEndpoint
from sentry.api.serializers import serialize
from sentry.apidocs.constants import RESPONSE_BAD_REQUEST, RESPONSE_UNAUTHORIZED
from sentry.apidocs.examples.organization_examples import OrganizationExamples
from sentry.apidocs.parameters import GlobalParams, GroupIdsQueryParam
from sentry.apidocs.utils import inline_sentry_response_serializer
from sentry.models import Organization
from sentry.models.group import Group
from sentry.models.projectownership import ProjectOwnership
from sentry.types.ratelimit import RateLimit, RateLimitCategory


class UpdatedGroupsType(TypedDict):
    updatedGroupIds: List[int]


@region_silo_endpoint
@extend_schema(tags=["Organizations"])
class OrganizationForceAutoAssignmentEndpoint(OrganizationEndpoint):
    public = {"PUT"}
    rate_limits = {"PUT": {RateLimitCategory.ORGANIZATION: RateLimit(1, 60)}}  # 1 rpm

    @extend_schema(
        operation_id="Force Autoassignment of Issues",
        parameters=[GlobalParams.ORG_SLUG, GroupIdsQueryParam.GROUP_IDS],
        request=None,
        responses={
            200: inline_sentry_response_serializer("UpdatedGroupIds", UpdatedGroupsType),
            400: RESPONSE_BAD_REQUEST,
            401: RESPONSE_UNAUTHORIZED,
            429: OpenApiResponse(
                description="Too many requests. Rate limit of 1 request per org per minute exceeded."
            ),
            431: OpenApiResponse(
                description="Too many group ids. Number of group ids should be <= 100."
            ),
        },
        examples=OrganizationExamples.UPDATED_GROUP_IDS,
    )
    def put(self, request: Request, organization: Organization) -> Response:
        """
        Endpoint for forcing autoassignment to run for specified group ids.
        This is for if a user incorrectly manually assigns a group and wants autoassignment to run.
        There is a rate limit of one request per organization per minute.
        """
        if ratelimiter.is_limited(  # type: ignore [attr-defined]
            key=f"org-force-autoassignment:{organization.id}",
            limit=1,
            window=60,
        ):
            return Response(
                {
                    "detail": "Too many requests. Rate limit of 1 request per org per minute exceeded."
                },
                status=429,
            )

        group_ids = request.data.get("groupIds")
        if group_ids and len(group_ids) > 100:
            return Response(
                {"detail": "Too many group ids. Number of group ids should be <= 100."}, status=431
            )

        if group_ids:
            group_ids = [int(group_id) for group_id in group_ids]
            groups = Group.objects.filter(id__in=group_ids)

            for group in groups:
                ProjectOwnership.handle_auto_assignment(project_id=group.project.id, group=group)

            result_group_ids = [group.id for group in groups]
            return Response({"updatedGroupIds": serialize(result_group_ids)}, status=200)

        return Response({"detail": "Request must include group ids."}, status=400)
