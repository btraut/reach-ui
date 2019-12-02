import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import Portal from "@reach/portal";
import { checkStyles, wrapEvent, useForkedRef } from "@reach/utils";
import FocusLock from "react-focus-lock";
import { RemoveScroll } from "react-remove-scroll";
import PropTypes from "prop-types";

const noop = () => {};

////////////////////////////////////////////////////////////////////////////////
// DialogOverlay

export const DialogOverlay = forwardRef(function DialogOverlay(
  { isOpen = true, ...props },
  forwardedRef
) {
  const ownRef = useRef(null);
  const ref = forwardedRef || ownRef;
  useEffect(() => {
    checkStyles("dialog");
  }, []);

  return isOpen ? (
    <Portal data-reach-dialog-wrapper>
      <DialogInner ref={ref} {...props} />
    </Portal>
  ) : null;
});

DialogOverlay.displayName = "DialogOverlay";
if (__DEV__) {
  DialogOverlay.propTypes = {
    initialFocusRef: () => {}
  };
}

////////////////////////////////////////////////////////////////////////////////
// DialogInner

const DialogInner = forwardRef(function DialogInner(
  {
    allowPinchZoom,
    initialFocusRef,
    onClick,
    onDismiss = noop,
    onMouseDown,
    onKeyDown,
    ...props
  },
  forwardedRef
) {
  const mouseDownTarget = useRef(null);
  const overlayNode = useRef(null);
  const ref = useForkedRef(overlayNode, forwardedRef);

  useEffect(() => createAriaHider(overlayNode.current), []);

  const activateFocusLock = useCallback(() => {
    if (initialFocusRef && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef]);

  return (
    <FocusLock autoFocus returnFocus onActivation={activateFocusLock}>
      <RemoveScroll allowPinchZoom={allowPinchZoom}>
        <div
          data-reach-dialog-overlay
          onClick={wrapEvent(onClick, event => {
            if (mouseDownTarget.current === event.target) {
              event.stopPropagation();
              onDismiss(event);
            }
          })}
          onMouseDown={wrapEvent(onMouseDown, event => {
            mouseDownTarget.current = event.target;
          })}
          onKeyDown={wrapEvent(onKeyDown, event => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onDismiss(event);
            }
          })}
          ref={ref}
          {...props}
        />
      </RemoveScroll>
    </FocusLock>
  );
});

DialogOverlay.displayName = "DialogOverlay";

////////////////////////////////////////////////////////////////////////////////
// DialogContent

export const DialogContent = forwardRef(function DialogContent(
  { onClick, onKeyDown, ...props },
  forwardedRef
) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      data-reach-dialog-content
      tabIndex="-1"
      onClick={wrapEvent(onClick, event => {
        event.stopPropagation();
      })}
      ref={forwardedRef}
      {...props}
    />
  );
});

DialogContent.displayName = "DialogContent";
if (__DEV__) {
  DialogContent.propTypes = {
    "aria-label": ariaLabelType,
    "aria-labelledby": ariaLabelType
  };
}

////////////////////////////////////////////////////////////////////////////////
// Dialog

export const Dialog = forwardRef(function Dialog(
  { isOpen, onDismiss = noop, initialFocusRef, ...props },
  forwardedRef
) {
  const ownRef = useRef(null);
  const ref = forwardedRef || ownRef;
  return (
    <DialogOverlay
      isOpen={isOpen}
      onDismiss={onDismiss}
      initialFocusRef={initialFocusRef}
    >
      <DialogContent ref={ref} {...props} />
    </DialogOverlay>
  );
});

Dialog.displayName = "Dialog";
if (__DEV__) {
  Dialog.propTypes = {
    isOpen: PropTypes.bool,
    onDismiss: PropTypes.func,
    "aria-label": ariaLabelType,
    "aria-labelledby": ariaLabelType
  };
}

export default Dialog;

////////////////////////////////////////////////////////////////////////////////
function createAriaHider(dialogNode) {
  let originalValues = [];
  let rootNodes = [];

  if (!dialogNode) {
    if (__DEV__) {
      console.warn(
        "A ref has not yet been attached to a dialog node when attempting to call `createAriaHider`."
      );
    }
    return noop;
  }

  Array.prototype.forEach.call(document.querySelectorAll("body > *"), node => {
    const portalNode = dialogNode.parentNode.parentNode.parentNode;
    if (node === portalNode) {
      return;
    }
    let attr = node.getAttribute("aria-hidden");
    let alreadyHidden = attr !== null && attr !== "false";
    if (alreadyHidden) {
      return;
    }
    originalValues.push(attr);
    rootNodes.push(node);
    node.setAttribute("aria-hidden", "true");
  });

  return () => {
    rootNodes.forEach((node, index) => {
      let originalValue = originalValues[index];
      if (originalValue === null) {
        node.removeAttribute("aria-hidden");
      } else {
        node.setAttribute("aria-hidden", originalValue);
      }
    });
  };
}

function ariaLabelType(props, name, compName, ...rest) {
  const details =
    "\nSee https://www.w3.org/TR/wai-aria/#aria-label for details.";
  if (!props["aria-label"] && !props["aria-labelledby"]) {
    return new Error(
      `A <${compName}> must have either an \`aria-label\` or \`aria-labelledby\` prop.
      ${details}`
    );
  }
  if (props["aria-label"] && props["aria-labelledby"]) {
    return new Error(
      "You provided both `aria-label` and `aria-labelledby` props to a <" +
        compName +
        ">. If the a label for this component is visible on the screen, that label's component should be given a unique ID prop, and that ID should be passed as the `aria-labelledby` prop into <" +
        compName +
        ">. If the label cannot be determined programmatically from the content of the element, an alternative label should be provided as the `aria-label` prop, which will be used as an `aria-label` on the HTML tag." +
        details
    );
  }
  return PropTypes.string(name, props, compName, ...rest);
}
