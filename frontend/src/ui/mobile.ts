import { useState, useEffect } from "react";

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleDeviceDetection = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(
        userAgent
      );
      const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/g.test(
        userAgent
      );

      if (isMobile || isTablet) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };

    handleDeviceDetection();
    window.addEventListener("resize", handleDeviceDetection);

    return () => {
      window.removeEventListener("resize", handleDeviceDetection);
    };
  }, []);

  return isMobile;
};
