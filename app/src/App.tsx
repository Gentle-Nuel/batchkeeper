import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { TabLayout, DrillLayout } from "./components/TabLayout";
import { Toast } from "./components/Toast";
import { useAppStore } from "./store/useAppStore";

// Every screen is code-split into its own chunk via React.lazy — this app
// had grown to one >500KB JS chunk covering all ~29 screens up front. Since
// this is a PWA (see vite.config.ts's injectManifest strategy), the service
// worker precaches every chunk this produces at install time regardless of
// which routes have been visited, so offline capability is unaffected —
// this only improves first-load time on a slow/metered connection.
const Onboarding = lazy(() => import("./screens/onboarding/Onboarding").then((m) => ({ default: m.Onboarding })));
const SignIn = lazy(() => import("./screens/auth/SignIn").then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => import("./screens/auth/SignUp").then((m) => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => import("./screens/auth/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const EmailConfirmed = lazy(() => import("./screens/auth/EmailConfirmed").then((m) => ({ default: m.EmailConfirmed })));
const ResetPassword = lazy(() => import("./screens/auth/ResetPassword").then((m) => ({ default: m.ResetPassword })));

const Production = lazy(() => import("./screens/production/Production").then((m) => ({ default: m.Production })));
const LogABatch = lazy(() => import("./screens/production/LogABatch").then((m) => ({ default: m.LogABatch })));
const BatchDetail = lazy(() => import("./screens/production/BatchDetail").then((m) => ({ default: m.BatchDetail })));
const LogASale = lazy(() => import("./screens/production/LogASale").then((m) => ({ default: m.LogASale })));
const AllBatches = lazy(() => import("./screens/production/AllBatches").then((m) => ({ default: m.AllBatches })));

const Materials = lazy(() => import("./screens/materials/Materials").then((m) => ({ default: m.Materials })));
const EditMaterial = lazy(() => import("./screens/materials/EditMaterial").then((m) => ({ default: m.EditMaterial })));
const AddStock = lazy(() => import("./screens/materials/AddStock").then((m) => ({ default: m.AddStock })));

const Products = lazy(() => import("./screens/products/Products").then((m) => ({ default: m.Products })));
const ProductDetail = lazy(() => import("./screens/products/ProductDetail").then((m) => ({ default: m.ProductDetail })));
const Reports = lazy(() => import("./screens/reports/Reports").then((m) => ({ default: m.Reports })));

const More = lazy(() => import("./screens/more/More").then((m) => ({ default: m.More })));
const Settings = lazy(() => import("./screens/more/Settings").then((m) => ({ default: m.Settings })));
const BusinessSetup = lazy(() => import("./screens/more/BusinessSetup").then((m) => ({ default: m.BusinessSetup })));
const BusinessProfile = lazy(() => import("./screens/more/BusinessProfile").then((m) => ({ default: m.BusinessProfile })));
const SyncStatus = lazy(() => import("./screens/more/SyncStatus").then((m) => ({ default: m.SyncStatus })));
const Notifications = lazy(() => import("./screens/more/Notifications").then((m) => ({ default: m.Notifications })));
const Account = lazy(() => import("./screens/more/Account").then((m) => ({ default: m.Account })));
const ChangeEmail = lazy(() => import("./screens/more/ChangeEmail").then((m) => ({ default: m.ChangeEmail })));
const ChangePassword = lazy(() => import("./screens/more/ChangePassword").then((m) => ({ default: m.ChangePassword })));
const DeleteAccount = lazy(() => import("./screens/more/DeleteAccount").then((m) => ({ default: m.DeleteAccount })));
const Help = lazy(() => import("./screens/more/Help").then((m) => ({ default: m.Help })));
const FAQ = lazy(() => import("./screens/more/FAQ").then((m) => ({ default: m.FAQ })));
const SendFeedback = lazy(() => import("./screens/more/SendFeedback").then((m) => ({ default: m.SendFeedback })));
const About = lazy(() => import("./screens/more/About").then((m) => ({ default: m.About })));
const PrivacyPolicy = lazy(() => import("./screens/more/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("./screens/more/TermsOfService").then((m) => ({ default: m.TermsOfService })));

/** Blank shell while a lazy screen chunk loads — matches TabLayout's own
 * AuthChecking placeholder so there's no visual flash between the two. */
function ScreenLoading() {
  return <div className="min-h-dvh bg-bg" />;
}

function App() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;
  const initAuth = useAppStore((s) => s.initAuth);

  // The Log a Sale sheet is a route overlay, so a back press pops the route and
  // would unmount it on the spot. Remember where it was opened (adjusting state
  // during render, so there is no flash of an unmounted frame) and keep it
  // mounted after the pop; `closing` tells it to slide out, and it calls
  // `onGone` once it has. `goneKey` records a location whose sheet has already
  // left, because the router applies navigation as a deferred transition: for a
  // moment after `onGone`, `backgroundLocation` is still set and without this
  // the sheet would be re-adopted and flash back in.
  const [sheet, setSheet] = useState<{ location: Location | null; goneKey: string | null }>({
    location: null,
    goneKey: null,
  });
  if (backgroundLocation && sheet.location?.key !== location.key && sheet.goneKey !== location.key) {
    setSheet({ location, goneKey: null });
  }
  const sheetLocation = sheet.location;
  const sheetClosing = !backgroundLocation && sheetLocation !== null;

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Toast />
      <Suspense fallback={<ScreenLoading />}>
        <Routes location={backgroundLocation ?? location}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/setup-business" element={<BusinessSetup />} />

          {/* Tab roots — persistent bottom nav */}
          <Route element={<TabLayout />}>
            <Route path="/" element={<Production />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/more" element={<More />} />
          </Route>

          {/* Drill-down screens — back button, no bottom nav */}
          <Route element={<DrillLayout />}>
            <Route path="/log-a-batch" element={<LogABatch />} />
            <Route path="/batches" element={<AllBatches />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            {/* Fallback for a direct load/refresh of the sheet URL (no background
                location in history state) — same component, just without a
                backdrop screen behind it. The normal path is the overlay below. */}
            <Route path="/batches/:id/log-a-sale" element={<LogASale />} />

            <Route path="/materials/new" element={<EditMaterial />} />
            <Route path="/materials/:id/edit" element={<EditMaterial />} />
            <Route path="/materials/:id/restock" element={<AddStock />} />

            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductDetail />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            <Route path="/reports" element={<Reports />} />

            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/business-profile" element={<BusinessProfile />} />
            <Route path="/settings/sync" element={<SyncStatus />} />
            <Route path="/settings/notifications" element={<Notifications />} />
            <Route path="/settings/account" element={<Account />} />
            <Route path="/settings/account/change-email" element={<ChangeEmail />} />
            <Route path="/settings/account/change-password" element={<ChangePassword />} />
            <Route path="/settings/account/delete" element={<DeleteAccount />} />
            <Route path="/settings/help" element={<Help />} />
            <Route path="/settings/help/feedback" element={<SendFeedback />} />
            <Route path="/settings/faq" element={<FAQ />} />
            <Route path="/settings/about" element={<About />} />
            <Route path="/settings/about/privacy" element={<PrivacyPolicy />} />
            <Route path="/settings/about/terms" element={<TermsOfService />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Log a Sale renders as a sheet over whatever was underneath (Batch Detail) */}
      {sheetLocation && (
        <Suspense fallback={null}>
          <Routes location={sheetLocation}>
            <Route
              path="/batches/:id/log-a-sale"
              element={
                <LogASale
                  closing={sheetClosing}
                  onGone={() => setSheet((s) => ({ location: null, goneKey: s.location?.key ?? s.goneKey }))}
                />
              }
            />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

export default App;
