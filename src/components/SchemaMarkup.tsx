import React, { useEffect } from 'react';

interface SchemaMarkupProps {
  type: 'LocalBusiness' | 'FAQPage' | 'Product' | 'BreadcrumbList';
  data: any;
}

const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ type, data }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    let schemaData = {
      "@context": "https://schema.org",
      "@type": type,
      ...data
    };

    script.innerHTML = JSON.stringify(schemaData);
    script.id = `json-ld-${type.toLowerCase()}`;
    
    // Remove existing script if any
    const existingScript = document.getElementById(script.id);
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById(script.id);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
};

export default SchemaMarkup;
