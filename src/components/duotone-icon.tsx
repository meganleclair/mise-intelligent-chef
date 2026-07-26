import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

/**
 * Wraps FontAwesomeIcon with the app's standard duotone secondary-layer
 * opacity, centralized here instead of repeated at every call site.
 */
export function DuotoneIcon({ style, ...props }: FontAwesomeIconProps) {
  return (
    <FontAwesomeIcon
      style={{ "--fa-secondary-opacity": "0.4", ...style } as NonNullable<FontAwesomeIconProps["style"]>}
      {...props}
    />
  );
}
