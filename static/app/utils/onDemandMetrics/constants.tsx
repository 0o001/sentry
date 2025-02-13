import {ErrorTags, FieldKey, SpanOpBreakdown, StackTags} from 'sentry/utils/fields';

export const STANDARD_SEARCH_FIELD_KEYS = new Set([
  FieldKey.RELEASE,
  FieldKey.DIST,
  FieldKey.ENVIRONMENT,
  FieldKey.TRANSACTION,
  FieldKey.PLATFORM,
  FieldKey.TRANSACTION_OP,
  FieldKey.TRANSACTION_STATUS,
  FieldKey.HTTP_METHOD,
  FieldKey.HTTP_STATUS_CODE,
  FieldKey.BROWSER_NAME,
  FieldKey.OS_NAME,
  FieldKey.GEO_COUNTRY_CODE,
]);

export const ON_DEMAND_METRICS_UNSUPPORTED_TAGS = new Set([
  FieldKey.APP_IN_FOREGROUND,
  FieldKey.DEVICE_ARCH,
  FieldKey.DEVICE_BATTERY_LEVEL,
  FieldKey.DEVICE_BRAND,
  FieldKey.DEVICE_CHARGING,
  FieldKey.DEVICE_LOCALE,
  FieldKey.DEVICE_ONLINE,
  FieldKey.DEVICE_ORIENTATION,
  FieldKey.DEVICE_SCREEN_DENSITY,
  FieldKey.DEVICE_SCREEN_DPI,
  FieldKey.DEVICE_SCREEN_HEIGHT_PIXELS,
  FieldKey.DEVICE_SCREEN_WIDTH_PIXELS,
  FieldKey.DEVICE_SIMULATOR,
  FieldKey.DEVICE_UUID,
  FieldKey.ERROR_RECEIVED,
  FieldKey.HTTP_REFERER,
  FieldKey.ID,
  FieldKey.MESSAGE,
  FieldKey.OS_BUILD,
  FieldKey.OS_KERNEL_VERSION,
  FieldKey.PLATFORM_NAME,
  FieldKey.PROFILE_ID,
  FieldKey.SDK_NAME,
  FieldKey.SDK_VERSION,
  FieldKey.TIMESTAMP_TO_DAY,
  FieldKey.TIMESTAMP_TO_HOUR,
  FieldKey.TIMESTAMP,
  FieldKey.TITLE,
  FieldKey.TRACE_PARENT_SPAN,
  FieldKey.TRACE_SPAN,
  FieldKey.TRACE,
  FieldKey.USER_IP,
  FieldKey.USER,
  FieldKey.USER_USERNAME,
  ...Object.values(SpanOpBreakdown),
  ...Object.values(StackTags),
  ...Object.values(ErrorTags),
]) as Set<FieldKey>;
