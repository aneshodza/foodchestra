import HomeIcon from './components/shared/HomeIcon';
import Button from './components/shared/Button';
import BackendStatus from './components/shared/BackendStatus';

function App() {
  return (
    <>
      <BackendStatus />
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <h1 className="card-title d-flex align-items-center gap-2">
                <HomeIcon />
                Foodchestra
              </h1>
              <p className="card-text">
                Track your food&apos;s journey from farm to shelf.
              </p>
              <Button label="Get started" onClick={() => undefined} />
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

export default App;
