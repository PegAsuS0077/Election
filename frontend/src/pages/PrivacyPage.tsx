import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function PrivacyPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "Privacy Policy – NepalVotes";
  }, []);

  return (
    <Layout
      title="Privacy Policy"
      titleNp="गोपनीयता नीति"
      subtitle="Last updated: February 24, 2026"
      subtitleNp="अन्तिम अपडेट: फेब्रुअरी २४, २०२६"
    >
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8 text-slate-600 dark:text-slate-400 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "परिचय" : "Introduction"}
            </h2>
            <p>
              {lang === "np"
                ? "NepalVotes (nepalvotes.live) ले तपाईंको गोपनीयतालाई सम्मान गर्दछ। यो नीतिले हामीले कस्तो जानकारी संकलन गर्छौं र यसलाई कसरी प्रयोग गर्छौं भन्ने बताउँछ।"
                : "NepalVotes (nepalvotes.live) respects your privacy. This policy explains what information we collect and how we use it."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "हामीले के संकलन गर्छौं" : "What We Collect"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "हामी कुनै व्यक्तिगत जानकारी (नाम, इमेल, फोन नम्बर, आदि) संकलन गर्दैनौं र भण्डारण गर्दैनौं। हामीले मात्र निम्न익명 उपयोग डेटा संकलन गर्छौं:"
                : "We do not collect or store any personal information (name, email, phone number, etc.). We only collect the following anonymous usage data:"}
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{lang === "np" ? "पृष्ठ दृश्यहरू र ट्राफिक स्रोत" : "Page views and traffic sources"}</li>
              <li>{lang === "np" ? "ब्राउजर प्रकार र अपरेटिङ सिस्टम" : "Browser type and operating system"}</li>
              <li>{lang === "np" ? "अनुमानित भौगोलिक क्षेत्र (देश/सहर स्तर)" : "Approximate geographic region (country/city level)"}</li>
              <li>{lang === "np" ? "साइट भित्र नेभिगेसन प्याटर्न" : "Navigation patterns within the site"}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "Google Analytics" : "Google Analytics"}
            </h2>
            <p>
              {lang === "np"
                ? "यो साइटले Google Analytics प्रयोग गर्दछ। Google Analytics ले cookies मार्फत익명 प्रयोगकर्ता व्यवहारको डेटा संकलन गर्दछ। यो डेटा Google को सर्भरमा भण्डारण हुन्छ र Google को गोपनीयता नीति अन्तर्गत छ।"
                : "This site uses Google Analytics to understand how visitors use it. Google Analytics collects anonymous usage data via cookies. This data is stored on Google's servers and is subject to Google's privacy policy."}
            </p>
            <p className="mt-3">
              {lang === "np"
                ? "तपाईं "
                : "You can opt out using the "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {lang === "np" ? "Google Analytics Opt-out Browser Add-on" : "Google Analytics Opt-out Browser Add-on"}
              </a>
              {lang === "np" ? " मार्फत opt out गर्न सक्नुहुन्छ।" : "."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "Cookies" : "Cookies"}
            </h2>
            <p>
              {lang === "np"
                ? "हामीले प्रयोग गरिने एकमात्र cookies Google Analytics द्वारा सेट गरिएका हुन्। यी cookies साइट विश्लेषणको लागि मात्र प्रयोग गरिन्छ। हामी कुनै मार्केटिङ वा ट्र्याकिङ cookies प्रयोग गर्दैनौं।"
                : "The only cookies we use are set by Google Analytics for site analytics purposes. We do not use any marketing or tracking cookies."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "भविष्यमा विज्ञापन" : "Advertising"}
            </h2>
            <p>
              {lang === "np"
                ? "यो साइटले भविष्यमा Google AdSense मार्फत विज्ञापन प्रदर्शन गर्न सक्छ। यदि विज्ञापन सक्षम गरिन्छ भने, Google ले प्रासंगिक विज्ञापनहरू देखाउन cookies प्रयोग गर्न सक्छ। तपाईं Google को विज्ञापन सेटिङ मार्फत personalized विज्ञापनहरू opt out गर्न सक्नुहुन्छ।"
                : "This site may display advertisements via Google AdSense in the future. If ads are enabled, Google may use cookies to show relevant ads. You can opt out of personalized ads through Google's ad settings."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "सम्पर्क" : "Contact"}
            </h2>
            <p>
              {lang === "np"
                ? "यस गोपनीयता नीतिबारे कुनै प्रश्न भए, कृपया हामीलाई सम्पर्क गर्नुहोस्:"
                : "If you have questions about this privacy policy, please contact us:"}
            </p>
            <p className="mt-2">
              <a
                href="mailto:riwajghimire1@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                riwajghimire1@gmail.com
              </a>
            </p>
          </section>

        </div>
      </main>
    </Layout>
  );
}
