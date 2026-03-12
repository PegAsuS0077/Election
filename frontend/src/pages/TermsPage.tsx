import { useEffect } from "react";
import Layout from "../components/Layout";
import { useElectionStore } from "../store/electionStore";

export default function TermsPage() {
  const lang = useElectionStore((s) => s.lang);

  useEffect(() => {
    document.title = "Terms of Use – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Terms of Use for NepalVotes (nepalvotes.live), including acceptable use, data-source disclaimer, and limitations of liability.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/terms");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live"); };
  }, []);

  return (
    <Layout
      title="Terms of Use"
      titleNp="प्रयोगका सर्तहरू"
      subtitle="Last updated: March 8, 2026"
      subtitleNp="अन्तिम अपडेट: मार्च ८, २०२६"
    >
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "१) स्वीकार" : "1) Acceptance"}
            </h2>
            <p>
              {lang === "np"
                ? "nepalvotes.live प्रयोग गर्दा तपाईं यी सर्तहरू मान्न सहमत हुनुहुन्छ। यदि सर्तहरूसँग सहमत हुनुहुन्न भने, कृपया साइट प्रयोग नगर्नुहोस्।"
                : "By using nepalvotes.live, you agree to these terms. If you do not agree, please do not use the site."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "२) सेवाको उद्देश्य" : "2) Service Purpose"}
            </h2>
            <p>
              {lang === "np"
                ? "NepalVotes सार्वजनिक रूपमा उपलब्ध निर्वाचन डेटा सजिलो ढंगले देखाउने स्वतन्त्र सूचना प्लेटफर्म हो। यो साइट कुनै सरकारी निकाय वा राजनीतिक दलसँग आबद्ध छैन।"
                : "NepalVotes is an independent informational platform that presents publicly available election data in a readable format. It is not affiliated with any government body or political party."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "३) डेटा स्रोत र शुद्धता" : "3) Data Source and Accuracy"}
            </h2>
            <p className="mb-3">
              {lang === "np"
                ? "निर्वाचन सम्बन्धी डेटा निर्वाचन आयोग नेपालको आधिकारिक स्रोतबाट सङ्कलन गरिएको अन्तिम अभिलेखमा आधारित छ।"
                : "Election data on this site is based on a preserved final archive collected from the Election Commission of Nepal's official source."}
            </p>
            <p>
              {lang === "np"
                ? "हामी डेटा सम्पादन गर्दैनौं, तर तेस्रो-पक्ष स्रोतमा ढिलाइ वा त्रुटि हुन सक्छ। आधिकारिक र अन्तिम नतिजाका लागि कृपया निर्वाचन आयोगकै वेबसाइट सन्दर्भ गर्नुहोस्।"
                : "We do not manually edit that source data, but delays or inaccuracies may occur upstream. For official and final results, always refer to the Election Commission website."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "४) स्वीकार्य प्रयोग" : "4) Acceptable Use"}
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                {lang === "np"
                  ? "साइटलाई वैधानिक र सामान्य सूचना प्रयोगका लागि प्रयोग गर्नुहोस्।"
                  : "Use the site for lawful and informational purposes."}
              </li>
              <li>
                {lang === "np"
                  ? "स्क्र्यापिङ, अत्यधिक अनुरोध, वा सेवा अवरुद्ध हुने क्रियाकलाप नगर्नुहोस्।"
                  : "Do not run abusive scraping, excessive requests, or behavior that degrades service availability."}
              </li>
              <li>
                {lang === "np"
                  ? "साइटको सामग्री भ्रामक रूपमा पुनःप्रकाशन नगर्नुहोस्।"
                  : "Do not republish content in a deceptive or misleading way."}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "५) विज्ञापन र तेस्रो पक्ष" : "5) Advertising and Third Parties"}
            </h2>
            <p>
              {lang === "np"
                ? "साइटमा तेस्रो-पक्ष विज्ञापन देखिन सक्छ। ती विज्ञापनहरू र बाह्य लिङ्कहरूको सामग्री सम्बन्धी जिम्मेवारी सम्बन्धित तेस्रो पक्षकै हुन्छ।"
                : "This site may display third-party advertisements. Third-party ad content and external links are the responsibility of those providers."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "६) दायित्व सीमितता" : "6) Limitation of Liability"}
            </h2>
            <p>
              {lang === "np"
                ? "यो सेवा 'जसरी उपलब्ध छ' आधारमा प्रदान गरिन्छ। यो साइट प्रयोगबाट हुने प्रत्यक्ष वा अप्रत्यक्ष क्षतिको लागि NepalVotes जिम्मेवार हुनेछैन।"
                : "The service is provided on an 'as available' basis. NepalVotes is not liable for direct or indirect losses arising from use of this website."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {lang === "np" ? "७) सम्पर्क" : "7) Contact"}
            </h2>
            <p>
              {lang === "np"
                ? "यी सर्तहरूबारे प्रश्न भए इमेलमार्फत सम्पर्क गर्नुहोस्:"
                : "For questions about these terms, contact:"}
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
