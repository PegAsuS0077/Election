import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function PrivacyPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "Privacy Policy – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Privacy Policy for NepalVotes (nepalvotes.live). Learn about data collection, cookies, Google Analytics, advertising partners (Google AdSense and Monetag), and your privacy rights.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/privacy-policy");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live"); };
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
            <p className="mb-3">
              {lang === "np"
                ? "यो साइटले cookies विश्लेषण र विज्ञापन उद्देश्यका लागि प्रयोग गर्दछ। यसमा Google Analytics जस्ता विश्लेषण सेवा र Google AdSense/Monetag जस्ता विज्ञापन साझेदारहरू समावेश हुन सक्छन्।"
                : "This site uses cookies for analytics and advertising purposes. This may include analytics providers like Google Analytics and ad partners such as Google AdSense and Monetag."}
            </p>
            <p>
              {lang === "np"
                ? "cookies तेस्रो-पक्ष सेवाहरू द्वारा सेट हुन सक्छन् र ती सेवाहरूको गोपनीयता नीतिअन्तर्गत पर्छन्। तपाईं आफ्नो ब्राउजर सेटिङबाट cookies अस्वीकार वा हटाउन सक्नुहुन्छ, तर यसले साइटका केही सुविधामा असर गर्न सक्छ।"
                : "Cookies may be set by third-party services and are governed by those providers' privacy policies. You can refuse or delete cookies through your browser settings, though this may affect some site functionality."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "विज्ञापन साझेदारहरू" : "Advertising Partners"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "यो साइटले Google AdSense वा Monetag जस्ता तेस्रो-पक्ष विज्ञापन साझेदारमार्फत विज्ञापन देखाउन सक्छ। यी सेवाहरूले विज्ञापन देखाउन, मापन गर्न, र सुधार गर्न cookies, web beacons, वा device identifiers प्रयोग गर्न सक्छन्।"
                : "This site may display ads via third-party partners such as Google AdSense and Monetag. These providers may use cookies, web beacons, or device identifiers to deliver, measure, and improve ads."}
            </p>
            <p className="mb-3">
              {lang === "np"
                ? "विज्ञापन साझेदारहरूले तपाईंको यस साइट वा अन्य साइटहरूमा भएका भ्रमणको आधारमा विज्ञापन वैयक्तिकरण गर्न सक्छन्। NepalVotes ले यस्ता साझेदारहरूलाई तपाईंको नाम, इमेल, वा फोन नम्बर जस्ता व्यक्तिगत जानकारी बेच्दैन।"
                : "Ad partners may personalize ads based on your visits to this and other websites. NepalVotes does not sell your directly identifying personal information (such as your name, email, or phone number) to ad partners."}
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
              {lang === "np" ? "Ad-Safe प्रतिबद्धता" : "Ad-Safe Commitment"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "हामी सुरक्षित र नीतिअनुकूल विज्ञापन अनुभवका लागि प्रतिबद्ध छौं। हामी क्लिक गर्न बाध्य पार्ने, भ्रामक प्लेसमेन्ट गर्ने, वा सामग्री छोप्ने intrusive विज्ञापन अभ्यासलाई समर्थन गर्दैनौं।"
                : "We are committed to a safe, policy-compliant ad experience. We do not support forced clicks, deceptive ad placement, or intrusive ad behavior that blocks content."}
            </p>
            <p className="mb-3">
              {lang === "np"
                ? "हामीले जानाजानी malware, auto-download, auto-redirect, वा भ्रामक pop-up/pop-under विज्ञापन समावेश गर्दैनौं। कुनै विज्ञापन असुरक्षित वा आपत्तिजनक देखिएमा हामीलाई रिपोर्ट गर्न सक्नुहुन्छ।"
                : "We do not intentionally run malware, auto-download, auto-redirect, or deceptive pop-up/pop-under ad behavior. If you see an unsafe or inappropriate ad, you can report it to us."}
            </p>
            <p>
              {lang === "np"
                ? "रिपोर्ट गर्दा सम्भव भए पेज URL, समय, र स्क्रिनसट पठाउनुहोस् ताकि हामी छिटो जाँच गर्न सकौं।"
                : "When reporting, please include the page URL, time, and a screenshot if possible so we can investigate quickly."}
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
