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
      subtitle="Last updated: March 2, 2026"
      subtitleNp="अन्तिम अपडेट: मार्च २, २०२६"
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
              {lang === "np" ? "Google AdSense विज्ञापन" : "Advertising (Google AdSense)"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "यो साइट Google AdSense मार्फत विज्ञापन प्रदर्शन गर्दछ। Google AdSense एउटा तेस्रो-पक्ष विज्ञापन सेवा हो जुन Google LLC द्वारा सञ्चालित छ। विज्ञापन सेवा प्रदान गर्न Google ले यो साइटमा cookies र web beacons प्रयोग गर्न सक्छ।"
                : "This site displays advertisements through Google AdSense, a third-party advertising service operated by Google LLC. To serve ads, Google may use cookies and web beacons on this site."}
            </p>
            <p className="mb-3">
              {lang === "np"
                ? "Google AdSense ले तपाईंको यस साइट र अन्य साइटहरूमा भ्रमणको आधारमा प्रासंगिक विज्ञापनहरू देखाउन cookies प्रयोग गर्दछ। यी cookies मा व्यक्तिगत पहिचान योग्य जानकारी समावेश छैन।"
                : "Google AdSense uses cookies to serve ads based on your prior visits to this site and other sites. These cookies do not contain personally identifiable information."}
            </p>
            <p>
              {lang === "np"
                ? "तपाईं "
                : "You can opt out of personalised advertising by visiting "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {lang === "np" ? "Google विज्ञापन सेटिङ" : "Google Ads Settings"}
              </a>
              {lang === "np"
                ? " मार्फत personalized विज्ञापनहरू opt out गर्न सक्नुहुन्छ। वैकल्पिक रूपमा, तपाईं "
                : " or by visiting "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {lang === "np" ? "aboutads.info" : "aboutads.info"}
              </a>
              {lang === "np"
                ? " मार्फत पनि opt out गर्न सक्नुहुन्छ।"
                : ". Google's privacy policy for advertising is available at "}
              {lang !== "np" && (
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  policies.google.com/technologies/ads
                </a>
              )}
              {lang !== "np" && "."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "localStorage र सेसन स्टोरेज" : "localStorage & Session Storage"}
            </h2>
            <p>
              {lang === "np"
                ? "यो साइटले तपाईंको ब्राउजरको localStorage मा केही प्राथमिकताहरू सुरक्षित गर्दछ — जस्तै भाषा (नेपाली/अंग्रेजी) र थिम (उज्यालो/अँध्यारो)। मतगणना डेटा sessionStorage मा क्यास गरिन्छ ताकि पृष्ठ नेभिगेसनमा पटक-पटक डाउनलोड नगर्नुपरोस्। यी सबै डेटा तपाईंकै डिभाइसमा रहन्छ र हाम्रो सर्भरमा पठाइँदैन।"
                : "This site stores a small amount of preference data in your browser's localStorage — specifically your chosen language (Nepali/English) and theme (light/dark). Vote count data is cached in sessionStorage to avoid re-downloading ~3 MB of data on every page navigation. All of this data stays on your device and is never sent to our servers."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "तेस्रो पक्षका लिङ्कहरू" : "Third-Party Links"}
            </h2>
            <p>
              {lang === "np"
                ? "यो साइटले निर्वाचन आयोग नेपालको वेबसाइट (result.election.gov.np) मा लिङ्क गर्दछ। ती बाह्य साइटहरूको गोपनीयता नीतिमा हाम्रो कुनै नियन्त्रण छैन।"
                : "This site links to the Election Commission of Nepal's website (result.election.gov.np). We have no control over the privacy practices of that external site."}
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
