import React, { useEffect } from "react";

const GoogleTranslate = () => {

  // Fallback: Load Google Translate Widget
  const loadGoogleTranslateWidget = () => {
    window.googleTranslateInit = () => {
      if (!window.google?.translate?.TranslateElement) {
        setTimeout(window.googleTranslateInit, 100);
      } else {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,pa,sa,mr,ur,bn,ta,te,kn,ml,gu,or,as,ne,si,bo,ks,tcy,sd,kon",
            layout:
              window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
            defaultLanguage: "en",
            autoDisplay: false,
          },
          "google_element"
        );
      }
      cleanUpGadgetText();
    };

    const loadGoogleTranslateScript = () => {
      if (!document.getElementById("google_translate_script")) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src =
          "https://translate.google.com/translate_a/element.js?cb=googleTranslateInit";
        script.id = "google_translate_script";
        script.onerror = () =>
          console.error("Error loading Google Translate script");
        document.body.appendChild(script);
      }
    };

    const cleanUpGadgetText = () => {
      const gadgetElement = document.querySelector(".goog-te-gadget");
      if (gadgetElement) {
        const textNodes = gadgetElement.childNodes;
        textNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = ""; // Clear text content
          }
        });
      }
    };

    loadGoogleTranslateScript();

    if (window.google && window.google.translate) {
      window.googleTranslateInit();
    }
  };

  useEffect(() => {
    loadGoogleTranslateWidget();

    // Hide Google Translate top banner bar globally
    const hideGoogleBar = () => {
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) {
        banner.style.display = 'none';
        banner.style.visibility = 'hidden';
      }
      
      // Reset body top position that Google Translate adds
      const body = document.body;
      if (body) {
        body.style.top = '0px';
        body.style.position = 'static';
      }

      // Hide the notification bar
      const notificationBar = document.querySelector('.goog-te-banner-frame.skiptranslate');
      if (notificationBar) {
        notificationBar.style.display = 'none';
      }
    };

    // Run immediately and on interval to catch dynamic elements
    hideGoogleBar();
    const interval = setInterval(hideGoogleBar, 100);

    // Also observe DOM changes
    const observer = new MutationObserver(hideGoogleBar);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <style>
        {`
          /* Hide Google Translate top banner bar completely */
          .goog-te-banner-frame,
          .goog-te-banner-frame.skiptranslate,
          iframe.goog-te-banner-frame,
          iframe.skiptranslate {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            position: absolute !important;
            top: -9999px !important;
          }

          /* Prevent body top positioning from Google Translate */
          body {
            position: static !important;
            top: 0 !important;
          }

          html body {
            position: static !important;
            top: 0 !important;
          }

          .goog-te-combo {
            display: inline-block;
            background-color: rgb(55 65 81);
            border: none;
            border-radius: 0.25rem;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            line-height: 1rem;
            transition: background-color 0.2s;
            outline: none;
            color: white;
            font-weight: 400;
            box-shadow: none;
            cursor: pointer;
          }

          .goog-te-combo:hover {
            background-color: rgb(75 85 99);
          }

          .goog-te-combo:focus {
            outline: 2px solid transparent;
            outline-offset: 2px;
            box-shadow: 0 0 0 2px rgb(250 204 21);
          }

          .goog-te-combo:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .goog-logo-link {
            display: none !important;
          }

          .goog-te-gadget {
            color: transparent !important;
            font-size: 0 !important;
          }

          .goog-te-gadget > span > a {
            display: none !important;
          }

          .goog-te-gadget .goog-te-combo {
            color: white;
          }

          #google_translate_element .goog-te-gadget-simple .goog-te-menu-value span:first-child {
            display: none;
          }

          #google_translate_element .goog-te-gadget-simple .goog-te-menu-value:before {
            content: "Language";
            color: white;
          }

          .goog-te-menu-frame {
            max-height: 400px !important;
            overflow-y: auto !important;
          }

          .skiptranslate > iframe {
            height: 0 !important;
            border-style: none;
            box-shadow: none;
            display: none !important;
          }
        `}
      </style>
      
      <div className="google-translate-container">
        <div id="google_element"></div>
      </div>
    </>
  );
};

export default GoogleTranslate;
